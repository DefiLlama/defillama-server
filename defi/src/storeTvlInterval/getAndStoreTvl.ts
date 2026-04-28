import { Protocol } from "../protocols/data";
import * as sdk from "@defillama/sdk";
// import storeNewTvl from "./storeNewTvl";
import storeNewTvl2 from "./storeNewTvl2";
import { TokensValueLocked, tvlsObject } from "../types";
import storeNewTokensValueLocked from "./storeNewTokensValueLocked";
import {
  hourlyTokensTvl,
  hourlyUsdTokensTvl,
  hourlyRawTokensTvl,
  dailyTokensTvl,
  dailyUsdTokensTvl,
  dailyRawTokensTvl,
} from "../utils/getLastRecord";
import computeTVL from "./computeTVL";
import BigNumber from "bignumber.js";
import { TABLES } from "../api2/db"
import { getCurrentUnixTimestamp } from "../utils/date";
import { StaleCoins } from "./staleCoins";
import { storeAllTokens } from "../../src/utils/shared/bridgedTvlPostgres";
import { elastic, humanizeNumber } from '@defillama/sdk';
import { getBlocksRetry, getCurrentBlock } from "./blocks";
import { importAdapterDynamic } from "../utils/imports/importAdapter";
import { deadChainsSet } from "../config/deadChains";
import { getJSON, setJSON } from "./redis";
import { recordChainFailure, clearChainFailure } from "./chainTvlFailures";
import axios from "axios";
import sluggify from "../utils/sluggify";

const FALLBACK_DEFAULT_MAX_AGE_SEC = 7 * 24 * 3600;
const FALLBACK_DEFAULT_MAX_SHARE = 0.05;

export type CacheFreshness = { isFresh: boolean; invalidCacheTime?: number; reason?: string };

// Decides whether a per-chain cached TVL value is fresh enough to substitute for
// a failed live fetch. Two checks (per issue #11354):
//   1. Time bound — never use a value older than TVL_FALLBACK_MAX_AGE_SEC (default 7d).
//      Without this, a months-old cached value could pass the share check below and
//      silently mask broken adapters indefinitely.
//   2. Share threshold — only substitute when the failing chain's last-known share is
//      small enough that masking it can't materially mislead total TVL. Default 5%.
// Both thresholds are env-tunable.
export function isCacheDataFresh(cacheData: any, totalTvl: number): CacheFreshness {
  if (!cacheData?.usdTvls || !cacheData?.tokensBalances || !cacheData?.usdTokenBalances || !cacheData?.rawTokenBalances || !cacheData?.timestamp)
    return { isFresh: false, reason: 'malformed-cache' }

  const maxAgeSec = +(process.env.TVL_FALLBACK_MAX_AGE_SEC ?? FALLBACK_DEFAULT_MAX_AGE_SEC)
  const ageSec = (Date.now() / 1000) - cacheData.timestamp
  if (ageSec > maxAgeSec) return { isFresh: false, invalidCacheTime: ageSec, reason: 'too-old' }

  const maxShare = +(process.env.TVL_FALLBACK_MAX_SHARE ?? FALLBACK_DEFAULT_MAX_SHARE)
  if ((cacheData.usdTvls / totalTvl) >= maxShare) return { isFresh: false, reason: 'over-threshold' }

  return { isFresh: true }
}

async function insertOnDb(useCurrentPrices: boolean, table: any, data: any, probabilitySampling: number = 1) {
  if (process.env.LOCAL === 'true' || !useCurrentPrices || Math.random() > probabilitySampling) return;
  try {
    const time = getCurrentUnixTimestamp()
    await table.upsert({
      time, ...data
    })
  } catch (e: any) {
    console.error(e?.message)
  }
}

type ChainBlocks = {
  [chain: string]: number;
}

async function getTvl(
  unixTimestamp: number,
  ethBlock: number,
  chainBlocks: ChainBlocks,
  protocol: Protocol,
  useCurrentPrices: boolean,
  usdTvls: tvlsObject<number>,
  tokensBalances: tvlsObject<TokensValueLocked>,
  usdTokenBalances: tvlsObject<TokensValueLocked>,
  rawTokenBalances: tvlsObject<TokensValueLocked>,
  tvlFunction: any,
  isFetchFunction: boolean,
  storedKey: string,
  maxRetries: number,
  staleCoins: StaleCoins,
  options: StoreTvlOptions = {} as StoreTvlOptions
) {
  let tvlErrorsObject = options.tvlErrorsObject ?? {}

  let chainDashPromise
  let chain
  const symbolToAddresses = options.symbolToAddresses ?? {}
  const skipMissingChains = options.skipMissingChains ?? false

  for (let i = 0; i < maxRetries; i++) {
    try {
      chain = storedKey.split('-')[0]
      const block = chainBlocks[chain]
      const params: any = { chain, block, timestamp: unixTimestamp, storedKey, protocol: protocol.name }
      const api: any = new sdk.ChainApi(params)
      api.api = api
      api.storedKey = storedKey
      let usdTvl_fromCache: number | undefined = undefined
      let tokenSymbolTvl_fromCache: { [address: string]: string } | undefined = undefined
      let tokenUsdTvl_fromCache: { [address: string]: number } | undefined = undefined


      if (options.runStats)
        options.runStats[storedKey] = api

      if (!isFetchFunction) {
        let tvlBalances: any
        if (options.partialRefill && !options.chainsToRefill?.includes(chain)) {
          tvlBalances = (options.cacheData as any)[storedKey]
          let preComputedTvlData = (options.cacheData as any)?.preComputedTvlData

          if (preComputedTvlData) {
            usdTvl_fromCache = preComputedTvlData.tvlData?.[storedKey]
            tokenSymbolTvl_fromCache = preComputedTvlData.tokenSymbolData?.[storedKey]
            tokenUsdTvl_fromCache = preComputedTvlData.tokenUsdData?.[storedKey]
          }

          if (!tvlBalances) {
            if (skipMissingChains) {
              console.info(`Cache data missing for ${storedKey}, but skipMissingChains is true, skipping...`)
              return;
            }
            throw new Error('Cache data missing for ' + storedKey)
          }
        } else {
          tvlBalances = await tvlFunction(api, ethBlock, chainBlocks, api);
          if (tvlBalances === undefined) tvlBalances = api.getBalances()
          chainDashPromise = storeAllTokens(Object.keys(tvlBalances));
        }
        Object.keys(tvlBalances).forEach((key) => {
          if (prefixMalformed(key)) delete tvlBalances[key]
          if (+tvlBalances[key] === 0) delete tvlBalances[key]
        })
        const isStandard = Object.entries(tvlBalances).every(
          (balance) => typeof balance[1] === "string"
        ); // Can't use stored prices because coingecko has undocumented aliases which we rely on (eg: busd -> binance-usd)


        if (!options.chainsToRefill?.includes(chain) && usdTvl_fromCache !== undefined && tokenSymbolTvl_fromCache && tokenUsdTvl_fromCache) {
          // console.log('using pre computed data for:', storedKey)

          usdTvls[storedKey] = usdTvl_fromCache
          tokensBalances[storedKey] = tokenSymbolTvl_fromCache as any
          usdTokenBalances[storedKey] = tokenUsdTvl_fromCache
        } else {

          let tvlPromise: ReturnType<any>;
          tvlPromise = computeTVL(tvlBalances, useCurrentPrices ? "now" : unixTimestamp, protocol.name, staleCoins);
          const tvlResults = await tvlPromise;
          usdTvls[storedKey] = tvlResults.usdTvl;
          tokensBalances[storedKey] = tvlResults.tokenBalances;
          usdTokenBalances[storedKey] = tvlResults.usdTokenBalances;
          if (tvlResults.symbolToAddresses) {
            for (const [sym, addrs] of Object.entries(tvlResults.symbolToAddresses)) {
              if (!symbolToAddresses[sym]) symbolToAddresses[sym] = [];
              for (const addr of addrs as string[]) {
                if (!symbolToAddresses[sym].includes(addr)) symbolToAddresses[sym].push(addr);
              }
            }
          }

          const rawTokenCount = Object.keys(tvlBalances).length
          const computedTokenCount = Object.keys(tvlResults.usdTokenBalances).length
          const pricelessTokenRatio = (1 - (computedTokenCount / rawTokenCount)) * 100
          if (rawTokenCount > 42) {
            elastic.writeLog('tvl-token-price-stats', {
              metadata: {
                application: 'tvl',
                type: 'token-price-stats',
                name: protocol.name,
                id: protocol.id,
                chain,
                storedKey,
              },
              data: {
                rawTokenCount,
                computedTokenCount,
                pricelessTokenRatio,
              }
            })
          }

        }


        if (isStandard) {
          rawTokenBalances[storedKey] = tvlBalances;
        } else {
          const normalizedBalances = {} as any;
          for (const [name, balance] of Object.entries(tvlBalances as any)) {
            if (typeof balance === "object") {
              normalizedBalances[
                name
              ] = new BigNumber(balance as any).toNumber(); // Some adapters return a BigNumber from bignumber.js so the results must be normalized
            } else {
              normalizedBalances[name] = balance
            }
          }
          rawTokenBalances[storedKey] = normalizedBalances;
        }
      } else {   // there are no more fetch tvl functions?
        usdTvls[storedKey] = Number(await tvlFunction(api, ethBlock, chainBlocks, api));
      }
      if (
        typeof usdTvls[storedKey] !== "number" ||
        Number.isNaN(usdTvls[storedKey])
      ) {
        throw new Error(
          `TVL of ${protocol.name} is not a number, instead it is ${usdTvls[storedKey]}`
        );
      }
      return
    } catch (e: any) {

      let errorString = e?.message
      try {
        errorString = JSON.stringify(e)
      } catch (e) { }
      await elastic.addErrorLog({
        errorStringFull: JSON.stringify(e),
        errorString,
        metadata: {
          application: 'tvl',
          type: 'getTvl',
          name: protocol.name,
          id: protocol.id,
          storedKey,
          chain,
        },
      } as any)
      if (i >= maxRetries - 1) {
        if (options.runType === 'cron-task') {
          // if cron-task run, don't throw Error, try to catch errors and process later in caller function
          tvlErrorsObject[storedKey] = e;
        } else {
          throw e
        }
      } else {
        continue;
      }
    }
  }
  if (chainDashPromise) await chainDashPromise;
}

function mergeBalances(key: string, storedKeys: string[], balancesObject: tvlsObject<TokensValueLocked>, options: { replaceEmptyString?: boolean } = {}) {
  if (balancesObject[key] === undefined) {
    balancesObject[key] = {}
    storedKeys.map(keyToMerge => {
      Object.entries(balancesObject[keyToMerge]).forEach((balance) => {
        let value: any = balance[1]
        if (typeof value === 'string' && value.includes('.')) value = +value
        let token = balance[0]
        if (options.replaceEmptyString && token === '') token = '<empty>'
        sdk.util.sumSingleBalance(balancesObject[key], token, value);
      });
    })
  }
}

export function prefixMalformed(address: string) {
  const parts = address.split(':')
  if (parts.length < 3) return false
  if (address.indexOf(':coingecko:') != -1) return true
  if (parts.length > 2 && parts[0] == parts[1]) return true
  return false
}

export interface StoreTvlTempCacheInfo {
  protocolName: string;
  totalTvl: number;
  storeKey: string;
  storeKeyTvl: number;
  cacheTime: number;
  invalidCacheTime: number;
}

type StoreTvlOptions = {
  returnCompleteTvlObject?: boolean,
  partialRefill?: boolean,
  chainsToRefill?: string[],
  cacheData?: Object,
  overwriteExistingData?: boolean,
  runType?: string,
  isRunFromUITool?: boolean
  skipChainsCheck?: boolean,
  runStats?: any,
  tempCacheInfo?: Array<StoreTvlTempCacheInfo>,
  symbolToAddresses: { [symbol: string]: string[] },
  tvlErrorsObject?: tvlsObject<Error>,
  skipMissingChains?: boolean,  // sometimes while refilling a protocol with multiple chains, we might be refilling at a point where the protocol was not yet deployed in some of its chains, which would cause the tvlFunction to throw an error for those chains
}

export type storeTvl2Options = StoreTvlOptions & {
  unixTimestamp: number,
  skipBlockData?: boolean,
  protocol: Protocol,
  staleCoins?: StaleCoins,
  maxRetries?: number,
  storePreviousData?: boolean,
  useCurrentPrices?: boolean,
  breakIfTvlIsZero?: boolean,
  fetchCurrentBlockData?: boolean,
  runBeforeStore?: () => Promise<void>,
}

export async function storeTvl2({
  unixTimestamp,
  protocol,
  staleCoins = {},
  maxRetries = 1,
  storePreviousData,
  useCurrentPrices,
  breakIfTvlIsZero,
  runBeforeStore,
  fetchCurrentBlockData = false,
  skipBlockData = false,
  ...options
}: storeTvl2Options) {
  let ethBlock: any = undefined
  let chainBlocks: ChainBlocks = {}
  const module = await importAdapterDynamic(protocol)


  if (fetchCurrentBlockData) {
    const blockData = await getCurrentBlock({ adapterModule: module, catchOnlyStaleRPC: true, });
    ethBlock = blockData.ethereumBlock
    chainBlocks = blockData.chainBlocks;
  } else if (!skipBlockData) {
    let blockFetchOptions: any = { adapterModule: module }
    if (options.chainsToRefill?.length) {
      blockFetchOptions = { chains: options.chainsToRefill }
    }
    const res = await getBlocksRetry(unixTimestamp, blockFetchOptions)
    ethBlock = res.ethereumBlock;
    chainBlocks = res.chainBlocks;
  }


  return storeTvl(unixTimestamp, ethBlock, chainBlocks, protocol, module, staleCoins, maxRetries, storePreviousData, useCurrentPrices, breakIfTvlIsZero, runBeforeStore, options);
}

export async function storeTvl(
  unixTimestamp: number,
  ethBlock: number,
  chainBlocks: ChainBlocks,
  protocol: Protocol,
  module: any,
  staleCoins: StaleCoins,
  maxRetries: number = 1,
  storePreviousData: boolean = true,
  useCurrentPrices: boolean = true,
  breakIfTvlIsZero: boolean = false,
  runBeforeStore?: () => Promise<void>,
  options: StoreTvlOptions = {} as StoreTvlOptions
) {
  const {
    partialRefill = false,
    returnCompleteTvlObject = false,
    chainsToRefill = [],
    cacheData,
    overwriteExistingData = false,
    runType = 'default',
    isRunFromUITool = false,
    skipChainsCheck = false,
  } = options

  const dateString = new Date(unixTimestamp * 1000).toISOString().slice(0, 10)

  if (partialRefill && (!chainsToRefill.length || !cacheData) && !skipChainsCheck) throw new Error('Missing chain list for refill')

  const adapterStartTimestamp = getCurrentUnixTimestamp()

  const usdTvls: tvlsObject<number> = {};
  const tokensBalances: tvlsObject<TokensValueLocked> = {};
  const usdTokenBalances: tvlsObject<TokensValueLocked> = {};
  const rawTokenBalances: tvlsObject<TokensValueLocked> = {};
  const tvlErrorsObject: tvlsObject<Error> = {};
  const symbolToAddresses: { [symbol: string]: string[] } = {};

  const chainTvlsToAdd: {
    [name: string]: string[]
  } = {}
  const runStats: any = {}
  try {
    let tvlPromises = Object.entries(module).map(async ([chain, value]) => {
      if (chain === "default") {
        return;
      }
      if (typeof value !== "object" || value === null) {
        return;
      }
      return Promise.all(Object.entries(value).map(async ([tvlType, tvlFunction]) => {
        if (typeof tvlFunction !== "function") {
          return
        }

        if (runType === 'cron-task' && deadChainsSet.has(chain)) tvlFunction = () => ({})
        let storedKey = `${chain}-${tvlType}`
        let tvlFunctionIsFetch = false;
        if (tvlType === "tvl") {
          storedKey = chain
        } else if (tvlType === "fetch") {
          storedKey = chain
          tvlFunctionIsFetch = true
          throw new Error("tvlType 'fetch' is deprecated. Please use 'tvl' instead.")
        }
        // const startTimestamp = getCurrentUnixTimestamp()
        await getTvl(unixTimestamp, ethBlock, chainBlocks, protocol, useCurrentPrices, usdTvls, tokensBalances,
          usdTokenBalances, rawTokenBalances, tvlFunction, tvlFunctionIsFetch, storedKey, maxRetries, staleCoins,
          { ...options, partialRefill, chainsToRefill, cacheData, runStats, symbolToAddresses, tvlErrorsObject, })
        let keyToAddChainBalances = tvlType;
        if (tvlType === "tvl" || tvlType === "fetch") {
          keyToAddChainBalances = "tvl"
        }

        if (options.skipMissingChains && usdTvls[storedKey] === undefined) {
          // console.info(`TVL data missing for ${storedKey}, but skipMissingChains is true, skipping...`)
          return;
        }


        if (chainTvlsToAdd[keyToAddChainBalances] === undefined) {
          chainTvlsToAdd[keyToAddChainBalances] = [storedKey]
        } else {
          chainTvlsToAdd[keyToAddChainBalances].push(storedKey)
        }
      }))
    })
    if (module.tvl || module.fetch) {
      throw new Error("Top level tvl or fetch functions are not allowed outside chain object. Please move them inside the chain object.")
    }
    await Promise.all(tvlPromises)


    for (const [tvlType, storedKeys] of Object.entries(chainTvlsToAdd)) {
      // get all chain keys and sum to total
      for (const key of storedKeys) {

        if (tvlErrorsObject[key]) {
          const errMsg = (tvlErrorsObject[key]?.message ?? 'unknown').slice(0, 200)
          const failureAt = Math.floor(Date.now() / 1000)
          let tempStoreKeyCache: any
          try {
            tempStoreKeyCache = await getCachedTvlData({ protocol, storeKey: key, options, tvlErrorsObject })
          } catch (e: any) {
            // Fallback exhausted — record the failure for the team's tracker, then re-throw to preserve existing behavior.
            // first_failure_at is set to the same timestamp as last_failure_at on insert; the upsert keeps the
            // original first_failure_at on subsequent failures so escalation tracks continuous duration.
            await recordChainFailure({
              protocol_id: String(protocol.id),
              chain: key,
              error_class: errMsg,
              first_failure_at: failureAt,
              last_failure_at: failureAt,
              fallback_used: false,
              fallback_reason: e?.fallbackReason ?? 'unknown',
              cached_tvl: 0,
              total_tvl: 0,
            })
            throw e
          }
          // Fallback succeeded — record that this chain ran on cached data so the team can act on chronic offenders.
          await recordChainFailure({
            protocol_id: String(protocol.id),
            chain: key,
            error_class: errMsg,
            first_failure_at: failureAt,
            last_failure_at: failureAt,
            fallback_used: true,
            fallback_reason: 'ok',
            cached_tvl: tempStoreKeyCache.usdTvls ?? 0,
            total_tvl: tempStoreKeyCache._totalTvl ?? 0,
          })

          usdTvls[key] = tempStoreKeyCache.usdTvls;
          tokensBalances[key] = tempStoreKeyCache.tokensBalances;
          usdTokenBalances[key] = tempStoreKeyCache.usdTokenBalances;
          rawTokenBalances[key] = tempStoreKeyCache.rawTokenBalances;

          // if all the data is present, store temp cache for key to use in future if needed
        } else if (runType === 'cron-task' && usdTvls[key] !== undefined && tokensBalances[key] !== undefined && usdTokenBalances[key] !== undefined && rawTokenBalances[key] !== undefined) {
          // Successful per-chain run — clear any prior failure record (fire-and-forget; never blocks the pipeline).
          void clearChainFailure(String(protocol.id), key)

          const tempStoreKeyResultCaheKey = getCachedTvlDataKey(protocol, key)

          // store temp result cache for key
          await setJSON(tempStoreKeyResultCaheKey, {
            usdTvls: usdTvls[key],
            tokensBalances: tokensBalances[key],
            usdTokenBalances: usdTokenBalances[key],
            rawTokenBalances: rawTokenBalances[key],
            timestamp: getCurrentUnixTimestamp(),
          }, { throwErrorWhenFailed: false })
        }
      }

      usdTvls[tvlType] = storedKeys.reduce((total, key) => total + usdTvls[key], 0)
      mergeBalances(tvlType, storedKeys, tokensBalances, { replaceEmptyString: true })
      mergeBalances(tvlType, storedKeys, usdTokenBalances, { replaceEmptyString: true })
      mergeBalances(tvlType, storedKeys, rawTokenBalances)
    }

    hackForMorphoKatana({ protocol, usdTvls, tokensBalances, usdTokenBalances, rawTokenBalances, dateString, })

    if (typeof usdTvls.tvl !== "number") {
      throw new Error("Project doesn't have total tvl")
    }

    logRunStats()

    if (options.tempCacheInfo && options.tempCacheInfo.length > 0) {
      const protocolTempCacheInfo = options.tempCacheInfo.filter(i => i.protocolName === protocol.name);
      if (protocolTempCacheInfo.length > 0) {
        const now = getCurrentUnixTimestamp();
        const earliestCacheTime = Math.min(...protocolTempCacheInfo.map(item => item.cacheTime));
        const timeDiffFromNow = now - earliestCacheTime;

        const cacheUsageLog = {
          metadata: {
            application: 'tvl',
            type: 'cache-usage',
            name: protocol.name,
            id: protocol.id,
            timestamp: now,
          },
          data: {
            totalCachedItems: protocolTempCacheInfo.length,
            cachedItems: protocolTempCacheInfo,
            aggregatedTvl: protocolTempCacheInfo.reduce((sum, item) => sum + item.storeKeyTvl, 0),
            totalTvl: protocolTempCacheInfo[0].totalTvl,
            earliestCacheUsed: earliestCacheTime,
            timeDiffFromNowSeconds: timeDiffFromNow,
          }
        }
        elastic.writeLog('tvl-cache-used', cacheUsageLog)
      }
    }

  } catch (e) {
    // console.error(protocol.name, e);
    logRunStats()
    throw e
  }
  if (!isRunFromUITool && breakIfTvlIsZero && Object.values(usdTvls).reduce((total, value) => total + value) === 0) {
    throw new Error(
      `Returned 0 TVL at timestamp ${unixTimestamp}`
    );
  }

  async function logRunStats() {
    const metadata = {
      application: 'tvl',
      type: 'getTvl',
      name: protocol.name,
      id: protocol.id,
      storedKey: 'total',
      ts: +new Date()
    }
    const aggData: any = {}
    const protocolData = { metadata, data: aggData }

    let allLogs = [protocolData,]

    Object.entries(runStats).forEach(([storedKey, api]: any) => {
      const { meta, label, ...stats } = api.getStats()
      const m = { ...metadata, storedKey, }
      Object.entries(stats).forEach(([key, value]) => {
        let minValue = key === 'getLogs' ? 10 : 50

        if (typeof value === 'number') {
          (aggData as any)[key] = (aggData as any)[key] || 0;
          (aggData as any)[key] += value
          if (value < minValue) delete (stats as any)[key];  // Remove low count stats to reduce log size
        } else {
          delete (stats as any)[key]
        }
      })

      if (Object.keys(stats).length === 0) return;
      allLogs.push({ metadata: m, data: stats })
    })

    Object.entries(aggData).forEach(([key, value]) => {
      let minValue = key === 'getLogs' ? 10 : 20
      if (typeof value === 'number' && value < minValue) {
        delete (aggData as any)[key]; // Remove low count stats to reduce log size
      }
    })

    if (!aggData.total && !aggData.getLogs)
      allLogs = allLogs.slice(1)

    for (const log of allLogs)
      await elastic.writeLog('rpc-stats', log)
  }


  if (runBeforeStore !== undefined) {
    await runBeforeStore();
  }
  try {
    const storeFn = async () => {
      await storeNewTvl2(protocol, unixTimestamp, usdTvls, storePreviousData, usdTokenBalances, overwriteExistingData, {
        debugData: { tokensBalances, usdTokenBalances, rawTokenBalances, usdTvls, symbolToAddresses },
      }); // Checks circuit breakers

      const options = { protocol, unixTimestamp, storePreviousData, overwriteExistingData, }
      const storeTokensAction = storeNewTokensValueLocked({
        ...options,
        tvl: tokensBalances,
        hourlyTvl: hourlyTokensTvl,
        dailyTvl: dailyTokensTvl,
      })
      const storeUsdTokensAction = storeNewTokensValueLocked({
        ...options,
        tvl: usdTokenBalances,
        hourlyTvl: hourlyUsdTokensTvl,
        dailyTvl: dailyUsdTokensTvl,
      });
      const storeRawTokensAction = storeNewTokensValueLocked({
        ...options,
        tvl: rawTokenBalances,
        hourlyTvl: hourlyRawTokensTvl,
        dailyTvl: dailyRawTokensTvl,
      });

      await Promise.all([storeTokensAction, storeUsdTokensAction, storeRawTokensAction]);
    }

    if (isRunFromUITool) {
      return {
        storeFn,
        usdTvls,
        protocol,
        unixTimestamp,
      }
    }

    if (process.env.DRY_RUN) {
      console.log(`DRY RUN - skipping db update, id: ${protocol.id} | name: ${protocol.name} | current tvl: ${usdTvls.tvl} | hn: ${humanizeNumber(usdTvls.tvl)}`)
    } else {
      await storeFn()
    }
  } catch (e) {
    console.error(protocol.name, e);
    return;
  }

  if (returnCompleteTvlObject) return usdTvls
  return usdTvls.tvl;
}

function getCachedTvlDataKey(protocol: Protocol, key: string) {
  return `storeTvlInterval-cache-${protocol.id}-${key}`
}

function throwWithReason(err: any, reason: string): never {
  if (err && typeof err === 'object') (err as any).fallbackReason = reason
  throw err ?? new Error('cache-not-fresh')
}

async function getCachedTvlData({ options, storeKey, protocol, tvlErrorsObject }: { options: StoreTvlOptions, storeKey: string, protocol: Protocol, tvlErrorsObject: tvlsObject<Error> }) {

  // cron-task and allow to use temp cache
  if (options.runType !== 'cron-task' || options.tempCacheInfo === undefined) {
    throwWithReason(tvlErrorsObject[storeKey], 'not-cron-task')
  }

  const totalTvl = await pullTvlNumber(protocol);

  if (totalTvl === null || (totalTvl as number) < 10e3)  // if total tvl is very low, it's better to fail than return cached data
    throwWithReason(tvlErrorsObject[storeKey], 'low-total-tvl')

  const tempStoreKeyCache = await getJSON(getCachedTvlDataKey(protocol, storeKey), { throwErrorWhenFailed: false });

  // query redis but cache was not found, throw Error
  if (tempStoreKeyCache === null)
    throwWithReason(tvlErrorsObject[storeKey], 'no-cache')

  const cacheCheck = isCacheDataFresh(tempStoreKeyCache, totalTvl!);
  if (!cacheCheck.isFresh) throwWithReason(tvlErrorsObject[storeKey], cacheCheck.reason ?? 'unknown')


  options.tempCacheInfo.push({
    protocolName: protocol.name,
    totalTvl: totalTvl!,
    storeKey,
    storeKeyTvl: tempStoreKeyCache.usdTvls,
    cacheTime: tempStoreKeyCache.timestamp,
    invalidCacheTime: cacheCheck.invalidCacheTime! ?? 0,
  })

  // Surface totalTvl on the returned cache object so the caller can record it on the failure row.
  // Prefixed with `_` to make it clear this is metadata for failure tracking, not part of the
  // cache snapshot itself.
  return { ...tempStoreKeyCache, _totalTvl: totalTvl! }

  async function pullTvlNumber(protocol: Protocol): Promise<number | null> {
    try {
      const response = await axios.get(`https://api.llama.fi/tvl/${sluggify(protocol)}`);
      return Number(response.data);
    } catch (e: any) {
      console.log(e?.message, 'Failed to pull total TVL from API, will not use cache for', protocol.name);
      return null;
    }
  }
}


// morpho deployment on katana has a unique doublecount issue where vb tokens should count towards katana chain tvl but not morpho tvl as the underlying tokens are already counted towards morpho tvl
function hackForMorphoKatana({ protocol, usdTvls, tokensBalances, usdTokenBalances, rawTokenBalances, dateString, }: { protocol: Protocol, usdTvls: any, tokensBalances: any, usdTokenBalances: any, rawTokenBalances: any, dateString: string }) {
  if (protocol.id !== '4025') return;

  let excludedUSDValue = 0
  let excludedBorrowedUSDValue = 0

  const doublecountedTokens = new Set(['0x2dca96907fde857dd3d816880a0df407eeb2d2f2', '0x203a662b0bd271a6ed5a60edfbd04bfce608fd36', '0x0913da6da4b42f538b445599b46bb4622342cf52', '0xee7d8bcfb72bc1880d0cf19822eb0a2e6577ab62'].map(i => 'katana:' + i.toLowerCase()))
  const doublecountedTokenSymbols = new Set(['vbUSDT', 'vbUSDC', 'vbWBTC', 'vbETH'].map(i => i.toLowerCase()))

  // remove double counted vb token balances from global tvl
  Object.entries(usdTokenBalances.tvl).forEach(([token, balance]: any) => {
    if (doublecountedTokenSymbols.has(token.toLowerCase())) {
      delete usdTokenBalances.tvl[token]
      excludedUSDValue += balance
    }
  })
  Object.entries(usdTokenBalances.borrowed).forEach(([token, balance]: any) => {
    if (doublecountedTokenSymbols.has(token.toLowerCase())) {
      delete usdTokenBalances.borrowed[token]
      excludedBorrowedUSDValue += balance
    }
  })

  Object.keys(tokensBalances.tvl).forEach((token: string) => {
    if (doublecountedTokenSymbols.has(token.toLowerCase())) {
      delete tokensBalances.tvl[token]
    }
  })

  Object.keys(tokensBalances.borrowed).forEach((token: string) => {
    if (doublecountedTokenSymbols.has(token.toLowerCase())) {
      delete tokensBalances.borrowed[token]
    }
  })


  Object.keys(rawTokenBalances.tvl).forEach((token: string) => {
    if (doublecountedTokens.has(token.toLowerCase())) {
      delete rawTokenBalances.tvl[token]
    }
  })

  Object.keys(rawTokenBalances.borrowed).forEach((token: string) => {
    if (doublecountedTokens.has(token.toLowerCase())) {
      delete rawTokenBalances.borrowed[token]
    }
  })

  usdTvls.tvl -= excludedUSDValue
  usdTvls.borrowed -= excludedBorrowedUSDValue

  if (excludedUSDValue > 0)
    console.log('Excluded katana tvl value:', sdk.humanizeNumber(excludedUSDValue), dateString)

  if (excludedBorrowedUSDValue > 0)
    console.log('Excluded katana borrowed tvl value:', sdk.humanizeNumber(excludedBorrowedUSDValue), dateString)
}