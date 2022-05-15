import { TokenPrices } from "../types";
import { Protocol } from "../protocols/data";
import { util } from "@defillama/sdk";
import storeNewTvl from "./storeNewTvl";
import * as Sentry from "@sentry/serverless";
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
import {InfluxDB, Point} from '@influxdata/influxdb-client'

const token = process.env.INFLUXDB_TOKEN
const url = 'https://eu-central-1-1.aws.cloud2.influxdata.com'

const influxClient = new InfluxDB({url, token})

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
  knownTokenPrices?: TokenPrices,
  getCoingeckoLock?: () => Promise<unknown>,
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      if (!isFetchFunction) {
        const tvlBalances = await tvlFunction(
          unixTimestamp,
          ethBlock,
          chainBlocks
        );
        const isStandard = Object.entries(tvlBalances).every(
          (balance) =>
            balance[0].includes("0x") && typeof balance[1] === "string"
        ); // Can't use stored prices because coingecko has undocumented aliases which we realy on (eg: busd -> binance-usd)
        let tvlPromise: ReturnType<typeof util.computeTVL>;
        if (isStandard && (useCurrentPrices || unixTimestamp > 1626000000)) { // July 11
          tvlPromise = computeTVL(tvlBalances, useCurrentPrices ? "now" : unixTimestamp);
        } else {
          tvlPromise = util.computeTVL(
            tvlBalances,
            useCurrentPrices ? "now" : unixTimestamp,
            false,
            knownTokenPrices,
            getCoingeckoLock,
            10
          );
        }
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
        let org = `0xngmi+influxdb@protonmail.com`
        let bucket = `test-errors`
        let writeClient = influxClient.getWriteApi(org, bucket, 'ns')

        let point = new Point('protocolError')
          .tag('protocol', protocol.name)
          .stringField("error", String(e))

        writeClient.writePoint(point)
        writeClient.flush()
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

export async function storeTvl(
  unixTimestamp: number,
  ethBlock: number,
  chainBlocks: ChainBlocks,
  protocol: Protocol,
  module: any,
  knownTokenPrices?: TokenPrices,
  maxRetries: number = 1,
  getCoingeckoLock?: () => Promise<unknown>,
  storePreviousData: boolean = true,
  useCurrentPrices: boolean = true,
  breakIfTvlIsZero: boolean = false,
  runBeforeStore?: () => Promise<void>
) {

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
        await getTvl(unixTimestamp, ethBlock, chainBlocks, protocol, useCurrentPrices, usdTvls, tokensBalances,
          usdTokenBalances, rawTokenBalances, tvlFunction, tvlFunctionIsFetch, storedKey, maxRetries, knownTokenPrices, getCoingeckoLock)
        let keyToAddChainBalances = tvlType;
        if(tvlType === "tvl" || tvlType === "fetch"){
          keyToAddChainBalances = "tvl"
        }
        if(chainTvlsToAdd[keyToAddChainBalances] === undefined){
          chainTvlsToAdd[keyToAddChainBalances] = [storedKey]
        } else {
          chainTvlsToAdd[keyToAddChainBalances].push(storedKey)
        }
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
        usdTokenBalances, rawTokenBalances, mainTvlIsFetch ? module.fetch : module.tvl, mainTvlIsFetch, 'tvl', maxRetries, knownTokenPrices, getCoingeckoLock)
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
    if (usdTvls.tvl > 100e9) {
      throw new Error(`TVL of ${protocol.name} is over 100bn`)
    }
  } catch (e) {
    console.error(protocol.name, e);
    const scope = new Sentry.Scope();
    scope.setTag("protocol", protocol.name);
    Sentry.AWSLambda.captureException(e, scope);
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
  } catch (e) {
    console.error(protocol.name, e);
    const scope = new Sentry.Scope();
    scope.setTag("protocol", protocol.name);
    Sentry.AWSLambda.captureException(e, scope);
    return;
  }

  return usdTvls.tvl;
}
