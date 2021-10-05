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
  dailyTokensTvl,
  dailyUsdTokensTvl,
} from "../utils/getLastRecord";
import computeTVL from "./computeTVL";

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
        console.error(protocol.name, e);
        continue;
      }
    }
  }
}

export async function storeTvl(
  unixTimestamp: number,
  ethBlock: number,
  chainBlocks: ChainBlocks,
  protocol: Protocol,
  knownTokenPrices?: TokenPrices,
  maxRetries: number = 1,
  getCoingeckoLock?: () => Promise<unknown>,
  storePreviousData: boolean = true,
  useCurrentPrices: boolean = true,
  breakIfTvlIsZero: boolean = false,
  runBeforeStore?: () => Promise<void>
) {

  let usdTvls: tvlsObject<number> = {};
  let tokensBalances: tvlsObject<TokensValueLocked> = {};
  let usdTokenBalances: tvlsObject<TokensValueLocked> = {};
  try {
    const module = await import(
      `../../DefiLlama-Adapters/projects/${protocol.module}`
    );
    let mainTvlIsFetch: boolean;
    if (module.tvl) {
      mainTvlIsFetch = false
    } else if (module.fetch) {
      mainTvlIsFetch = true
    } else {
      throw new Error("Protocol doesn't have a tvl/fetch export")
    }
    const mainTvlPromise = getTvl(unixTimestamp, ethBlock, chainBlocks, protocol, useCurrentPrices, usdTvls, tokensBalances, 
      usdTokenBalances, mainTvlIsFetch?module.fetch:module.tvl, mainTvlIsFetch, 'tvl', maxRetries, knownTokenPrices, getCoingeckoLock)
    await Promise.all(
      Object.entries(module).map(async ([chain, value]) => {
        if (chain === "default") {
          return;
        }
        if (typeof value !== "object" || value === null) {
          return;
        }
        return Promise.all(Object.entries(value).map(async ([tvlType, tvlFunction])=>{
          if(typeof tvlFunction !== "function"){
            return
          }
          let storedKey = `${chain}-${tvlType}`
          let tvlFunctionIsFetch = false;
          if(tvlType === "tvl"){
            storedKey = chain
          } else if(tvlType === "fetch"){
            storedKey = chain
            tvlFunctionIsFetch = true
          }
          await getTvl(unixTimestamp, ethBlock, chainBlocks, protocol, useCurrentPrices, usdTvls, tokensBalances, 
            usdTokenBalances, tvlFunction, tvlFunctionIsFetch, storedKey, maxRetries, knownTokenPrices, getCoingeckoLock)
        }))
      }).concat([mainTvlPromise as Promise<any>])
    );
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
      dailyTokensTvl,
      storePreviousData
    );
    const storeUsdTokensAction = storeNewTokensValueLocked(
      protocol,
      unixTimestamp,
      usdTokenBalances,
      hourlyUsdTokensTvl,
      dailyUsdTokensTvl,
      storePreviousData
    );

    await Promise.all([storeTokensAction, storeUsdTokensAction]);
  } catch (e) {
    console.error(protocol.name, e);
    const scope = new Sentry.Scope();
    scope.setTag("protocol", protocol.name);
    Sentry.AWSLambda.captureException(e, scope);
    return;
  }

  return usdTvls.tvl;
}
