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
import { elastic } from '@defillama/sdk';
import { getBlocksRetry, getCurrentBlock } from "./blocks";
import { importAdapterDynamic } from "../utils/imports/importAdapter";
import { deadChainsSet } from "../config/deadChains";

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
  let chainDashPromise
  let chain
  for (let i = 0; i < maxRetries; i++) {
    try {
      chain = storedKey.split('-')[0]
      const block = chainBlocks[chain]
      const params: any = { chain, block, timestamp: unixTimestamp, storedKey, protocol: protocol.name }
      const api: any = new sdk.ChainApi(params)
      api.api = api
      api.storedKey = storedKey

      if (options.runStats)
        options.runStats[storedKey] = api

      if (!isFetchFunction) {
        let tvlBalances: any
        if (options.partialRefill && !options.chainsToRefill?.includes(storedKey)) {
          tvlBalances = (options.cacheData as any)[storedKey]
          if (!tvlBalances)
            throw new Error('Cache data missing for ' + storedKey)
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
        let tvlPromise: ReturnType<any>;
        tvlPromise = computeTVL(tvlBalances, useCurrentPrices ? "now" : unixTimestamp, protocol.name, staleCoins);
        const tvlResults = await tvlPromise;
        usdTvls[storedKey] = tvlResults.usdTvl;
        tokensBalances[storedKey] = tvlResults.tokenBalances;
        usdTokenBalances[storedKey] = tvlResults.usdTokenBalances;
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
      } else {
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
        error: e as any,
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
        throw e
      } else {
        insertOnDb(useCurrentPrices, TABLES.TvlMetricsErrors2, { error: String(e), protocol: protocol.name, chain: storedKey.split('-')[0], storedKey })
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

  if (partialRefill && (!chainsToRefill.length || !cacheData) && !skipChainsCheck) throw new Error('Missing chain list for refill')

  const adapterStartTimestamp = getCurrentUnixTimestamp()

  const usdTvls: tvlsObject<number> = {};
  const tokensBalances: tvlsObject<TokensValueLocked> = {};
  const usdTokenBalances: tvlsObject<TokensValueLocked> = {};
  const rawTokenBalances: tvlsObject<TokensValueLocked> = {};
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
        const startTimestamp = getCurrentUnixTimestamp()
        await getTvl(unixTimestamp, ethBlock, chainBlocks, protocol, useCurrentPrices, usdTvls, tokensBalances,
          usdTokenBalances, rawTokenBalances, tvlFunction, tvlFunctionIsFetch, storedKey, maxRetries, staleCoins,
          { ...options, partialRefill, chainsToRefill, cacheData, runStats, })
        let keyToAddChainBalances = tvlType;
        if (tvlType === "tvl" || tvlType === "fetch") {
          keyToAddChainBalances = "tvl"
        }
        if (chainTvlsToAdd[keyToAddChainBalances] === undefined) {
          chainTvlsToAdd[keyToAddChainBalances] = [storedKey]
        } else {
          chainTvlsToAdd[keyToAddChainBalances].push(storedKey)
        }
        const currentTime = getCurrentUnixTimestamp()
        insertOnDb(useCurrentPrices, TABLES.TvlMetricsCompleted, { elapsedTime: currentTime - startTimestamp, storedKey, chain: storedKey.split('-')[0], protocol: protocol.name }, 0.05)
      }))
    })
    if (module.tvl || module.fetch) {
      throw new Error("Top level tvl or fetch functions are not allowed outside chain object. Please move them inside the chain object.")
      let mainTvlIsFetch: boolean;
      if (module.tvl) {
        mainTvlIsFetch = false
      } else {
        mainTvlIsFetch = true
      }
      const mainTvlPromise = getTvl(unixTimestamp, ethBlock, chainBlocks, protocol, useCurrentPrices, usdTvls, tokensBalances,
        usdTokenBalances, rawTokenBalances, mainTvlIsFetch ? module.fetch : module.tvl, mainTvlIsFetch, 'tvl', maxRetries, staleCoins)
      tvlPromises = tvlPromises.concat([mainTvlPromise as Promise<any>])
    }
    await Promise.all(tvlPromises)
    Object.entries(chainTvlsToAdd).map(([tvlType, storedKeys]) => {
      if (usdTvls[tvlType] === undefined) {
        usdTvls[tvlType] = storedKeys.reduce((total, key) => total + usdTvls[key], 0)
        mergeBalances(tvlType, storedKeys, tokensBalances, { replaceEmptyString: true })
        mergeBalances(tvlType, storedKeys, usdTokenBalances, { replaceEmptyString: true })
        mergeBalances(tvlType, storedKeys, rawTokenBalances)
      }
    })
    if (typeof usdTvls.tvl !== "number") {
      throw new Error("Project doesn't have total tvl")
    }

    logRunStats()

  } catch (e) {
    // console.error(protocol.name, e);
    insertOnDb(useCurrentPrices, TABLES.TvlMetricsErrors2, { error: String(e), protocol: protocol.name, storedKey: 'aggregate', chain: 'aggregate' })
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
        debugData: { tokensBalances, usdTokenBalances, rawTokenBalances, usdTvls },
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

    if (!process.env.DRY_RUN) {
      await storeFn()
    }
  } catch (e) {
    console.error(protocol.name, e);
    insertOnDb(useCurrentPrices, TABLES.TvlMetricsErrors2, { error: String(e), protocol: protocol.name, storedKey: 'store', chain: 'store' })
    return;
  }

  insertOnDb(useCurrentPrices, TABLES.TvlMetricsCompleted, { protocol: protocol.name, storedKey: 'all', chain: 'all', elapsedTime: getCurrentUnixTimestamp() - adapterStartTimestamp })
  if (returnCompleteTvlObject) return usdTvls
  return usdTvls.tvl;
}

