import { Protocol } from "../protocols/data";
import { util } from "@defillama/sdk";
import storeNewTvl from "./storeNewTvl";
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
import {executeAndIgnoreErrors} from "./errorDb"
import { getCurrentUnixTimestamp } from "../utils/date";
import { StaleCoins } from "./staleCoins";

function insertOnDb(useCurrentPrices:boolean, query:string, params:(string|number)[], storedKey:string, probabilitySampling: number = 1){
  if (process.env.LOCAL === 'true') return;
  if(useCurrentPrices === true && Math.random() <= probabilitySampling){
    const currentTime = getCurrentUnixTimestamp()
    executeAndIgnoreErrors(query, [currentTime, ...params, storedKey, storedKey.split("-")[0]])
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
  for (let i = 0; i < maxRetries; i++) {
    try {
      if (!isFetchFunction) {
        let tvlBalances: any
        if (options.partialRefill && !options.chainsToRefill?.includes(storedKey)) {
          tvlBalances = (options.cacheData as any)[storedKey]
          if (!tvlBalances)
            throw new Error('Cache data missing for '+ storedKey)
        } else {
          tvlBalances = await tvlFunction(
            unixTimestamp,
            ethBlock,
            chainBlocks
          );
        }
        Object.keys(tvlBalances).forEach((key) => {
          if (+tvlBalances[key] === 0) delete tvlBalances[key]
        })
        const isStandard = Object.entries(tvlBalances).every(
          (balance) => typeof balance[1] === "string"
        ); // Can't use stored prices because coingecko has undocumented aliases which we rely on (eg: busd -> binance-usd)
        let tvlPromise: ReturnType<any>;
        tvlPromise = computeTVL(tvlBalances, useCurrentPrices ? "now" : unixTimestamp, staleCoins);
        const tvlResults = await tvlPromise;
        usdTvls[storedKey] = tvlResults.usdTvl;
        tokensBalances[storedKey] = tvlResults.tokenBalances;
        usdTokenBalances[storedKey] = tvlResults.usdTokenBalances;
        if(isStandard){
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
        usdTvls[storedKey] = Number(await tvlFunction(
          unixTimestamp,
          ethBlock,
          chainBlocks
        ));
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
    } catch (e) {
      if (i >= maxRetries - 1) {
        throw e
      } else {
        insertOnDb(useCurrentPrices, 'INSERT INTO `errors2` VALUES (?, ?, ?, ?, ?)', [protocol.name, String(e)], storedKey)
        continue;
      }
    }
  }
}

function mergeBalances(key:string, storedKeys:string[], balancesObject:tvlsObject<TokensValueLocked>){
  if(balancesObject[key] === undefined){
    balancesObject[key] = {}
    storedKeys.map(keyToMerge=>{
      Object.entries(balancesObject[keyToMerge]).forEach((balance) => {
        util.sumSingleBalance(balancesObject[key], balance[0], balance[1]);
      });
    })
  }
}

type StoreTvlOptions = {
  partialRefill?: boolean,
  chainsToRefill?: string[],
  cacheData?: Object
}

export async function storeTvl(
  unixTimestamp: number,
  ethBlock: number,
  chainBlocks: ChainBlocks,
  protocol: Protocol,
  module: any,
  staleCoins: StaleCoins,
  maxRetries: number = 1,
  _getCoingeckoLock?: () => Promise<unknown>, // TODO: remove unused
  storePreviousData: boolean = true,
  useCurrentPrices: boolean = true,
  breakIfTvlIsZero: boolean = false,
  runBeforeStore?: () => Promise<void>,
  options: StoreTvlOptions = {} as StoreTvlOptions
) {
  const {
    partialRefill = false,
    chainsToRefill = [],
    cacheData,
  } = options

  if (partialRefill && (!chainsToRefill.length || !cacheData)) throw new Error('Missing chain list for refill')

  const adapterStartTimestamp = getCurrentUnixTimestamp()

  const usdTvls: tvlsObject<number> = {};
  const tokensBalances: tvlsObject<TokensValueLocked> = {};
  const usdTokenBalances: tvlsObject<TokensValueLocked> = {};
  const rawTokenBalances: tvlsObject<TokensValueLocked> = {};
  const chainTvlsToAdd: {
    [name: string]: string[]
  } = {}
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
        let storedKey = `${chain}-${tvlType}`
        let tvlFunctionIsFetch = false;
        if (tvlType === "tvl") {
          storedKey = chain
        } else if (tvlType === "fetch") {
          storedKey = chain
          tvlFunctionIsFetch = true
        }
        const startTimestamp = getCurrentUnixTimestamp()
        await getTvl(unixTimestamp, ethBlock, chainBlocks, protocol, useCurrentPrices, usdTvls, tokensBalances,
          usdTokenBalances, rawTokenBalances, tvlFunction, tvlFunctionIsFetch, storedKey, maxRetries, staleCoins, {...options, partialRefill, chainsToRefill, cacheData })
        let keyToAddChainBalances = tvlType;
        if(tvlType === "tvl" || tvlType === "fetch"){
          keyToAddChainBalances = "tvl"
        }
        if(chainTvlsToAdd[keyToAddChainBalances] === undefined){
          chainTvlsToAdd[keyToAddChainBalances] = [storedKey]
        } else {
          chainTvlsToAdd[keyToAddChainBalances].push(storedKey)
        }
        const currentTime = getCurrentUnixTimestamp()
        insertOnDb(useCurrentPrices, 'INSERT INTO `completed` VALUES (?, ?, ?, ?, ?)', [protocol.name, currentTime - startTimestamp], storedKey, 0.05)
      }))
    })
    if (module.tvl || module.fetch) {
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
    Object.entries(chainTvlsToAdd).map(([tvlType, storedKeys])=>{
      if(usdTvls[tvlType]===undefined){
        usdTvls[tvlType] = storedKeys.reduce((total, key)=>total+usdTvls[key], 0)
        mergeBalances(tvlType, storedKeys, tokensBalances)
        mergeBalances(tvlType, storedKeys, usdTokenBalances)
        mergeBalances(tvlType, storedKeys, rawTokenBalances)
      }
    })
    if (typeof usdTvls.tvl !== "number") {
      throw new Error("Project doesn't have total tvl")
    }
    if (usdTvls.tvl === 0 && protocol.name === "Tarot") {
      throw new Error("Tarot TVL is not 0")
    }
  } catch (e) {
    console.error(protocol.name, e);
    insertOnDb(useCurrentPrices, 'INSERT INTO `errors2` VALUES (?, ?, ?, ?, ?)', [protocol.name, String(e)], "aggregate")
    return;
  }
  if (breakIfTvlIsZero && Object.values(usdTvls).reduce((total, value) => total + value) === 0) {
    throw new Error(
      `Returned 0 TVL at timestamp ${unixTimestamp}`
    );
  }

  if (runBeforeStore !== undefined) {
    await runBeforeStore();
  }
  try {
    if (!process.env.DRY_RUN) {
      await storeNewTvl(protocol, unixTimestamp, usdTvls, storePreviousData); // Checks circuit breakers

      const storeTokensAction = storeNewTokensValueLocked(
        protocol,
        unixTimestamp,
        tokensBalances,
        hourlyTokensTvl,
        dailyTokensTvl
      );
      const storeUsdTokensAction = storeNewTokensValueLocked(
        protocol,
        unixTimestamp,
        usdTokenBalances,
        hourlyUsdTokensTvl,
        dailyUsdTokensTvl
      );
      const storeRawTokensAction = storeNewTokensValueLocked(
        protocol,
        unixTimestamp,
        rawTokenBalances,
        hourlyRawTokensTvl,
        dailyRawTokensTvl
      );

      await Promise.all([storeTokensAction, storeUsdTokensAction, storeRawTokensAction]);
    }
  } catch (e) {
    console.error(protocol.name, e);
    insertOnDb(useCurrentPrices, 'INSERT INTO `errors2` VALUES (?, ?, ?, ?, ?)', [protocol.name, String(e)], "store")
    return;
  }

  insertOnDb(useCurrentPrices, 'INSERT INTO `completed` VALUES (?, ?, ?, ?, ?)', [protocol.name, getCurrentUnixTimestamp() - adapterStartTimestamp], "all", 1)
  return usdTvls.tvl;
}
