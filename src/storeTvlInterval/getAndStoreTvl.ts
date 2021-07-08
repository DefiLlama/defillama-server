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

export async function storeTvl(
  unixTimestamp: number,
  ethBlock: number,
  chainBlocks: {
    [chain: string]: number;
  },
  protocol: Protocol,
  knownTokenPrices?: TokenPrices,
  maxRetries: number = 1,
  getCoingeckoLock?: () => Promise<unknown>,
  storePreviousData: boolean = true,
  useCurrentPrices: boolean = true,
  breakIfTvlIsZero: boolean = false,
  runBeforeStore?: () => Promise<void>
) {
  for (let i = 0; i < maxRetries; i++) {
    let usdTvls: tvlsObject<number> = {};
    let tokensBalances: tvlsObject<TokensValueLocked> = {};
    let usdTokenBalances: tvlsObject<TokensValueLocked> = {};
    try {
      const module = await import(
        `../../DefiLlama-Adapters/projects/${protocol.module}`
      );
      await Promise.all(
        Object.entries(module).map(async ([chain, value]) => {
          if (chain === "default") {
            return;
          }
          const container =
            chain === "tvl" || chain === "fetch" ? module : value;
          const storedKey = chain === "fetch" ? "tvl" : chain;
          if (typeof container !== "object" || container === null) {
            return;
          }
          if (container.tvl) {
            const tvlBalances = await container.tvl(
              unixTimestamp,
              ethBlock,
              chainBlocks
            );
            const isStandard =
              Object.entries(tvlBalances).every(
                (balance) =>
                  balance[0].includes("0x") && typeof balance[1] === "string"
              ) && useCurrentPrices;
            let tvlPromise: ReturnType<typeof util.computeTVL>;
            if (isStandard) {
              tvlPromise = computeTVL(tvlBalances);
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
          } else if (container.fetch) {
            usdTvls[storedKey] = Number(await container.fetch(
              unixTimestamp,
              ethBlock,
              chainBlocks
            ));
          } else {
            return;
          }
          if (
            typeof usdTvls[storedKey] !== "number" ||
            Number.isNaN(usdTvls[storedKey])
          ) {
            throw new Error(
              `TVL of ${protocol.name} is not a number, instead it is ${usdTvls[storedKey]}`
            );
          }
        })
      );
    } catch (e) {
      if (i >= maxRetries - 1) {
        console.error(protocol.name, e);
        const scope = new Sentry.Scope();
        scope.setTag("protocol", protocol.name);
        Sentry.AWSLambda.captureException(e, scope);
        return;
      } else {
        continue;
      }
    }
    if (breakIfTvlIsZero && usdTvls.tvl === 0) {
      return 0;
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
}
