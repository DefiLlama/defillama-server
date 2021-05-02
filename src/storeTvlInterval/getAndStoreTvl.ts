import { TokenPrices } from "../types";
import { Protocol } from "../protocols/data";
import { util } from "@defillama/sdk";
import storeNewTvl from "./storeNewTvl";
import * as Sentry from "@sentry/serverless";
import { TokensValueLocked } from "../types";
import storeNewTokensValueLocked from "./storeNewTokensValueLocked";
import { hourlyTokensTvl, hourlyUsdTokensTvl, dailyTokensTvl, dailyUsdTokensTvl } from "../utils/getLastRecord";

export async function storeTvl(
  unixTimestamp: number,
  ethBlock: number,
  chainBlocks: {
    [chain: string]: number;
  },
  protocol: Protocol,
  knownTokenPrices?: TokenPrices,
  maxRetries: number = 1,
  getCoingeckoLock?: () => Promise<unknown>
) {
  for (let i = 0; i < maxRetries; i++) {
    let tvl: number;
    let tokensBalances: TokensValueLocked = {};
    let usdTokenBalances: TokensValueLocked = {};
    try {
      const module = await import(
        `../../DefiLlama-Adapters/projects/${protocol.module}`
      );
      if (module.tvl) {
        const tvlBalances = await module.tvl(
          unixTimestamp,
          ethBlock,
          chainBlocks
        );
        const tvlResults = await util.computeTVL(
          tvlBalances,
          "now",
          false,
          knownTokenPrices,
          getCoingeckoLock,
          10
        );
        tvl = tvlResults.usdTvl;
        tokensBalances = tvlResults.tokenBalances;
        usdTokenBalances = tvlResults.usdTokenBalances;
      } else if (module.fetch) {
        tvl = Number(await module.fetch());
      } else {
        throw new Error(
          `Module for ${protocol.name} does not have a normal interface`
        );
      }
      if (typeof tvl !== "number" || Number.isNaN(tvl)) {
        throw new Error(
          `TVL of ${protocol.name} is not a number, instead it is ${tvl}`
        );
      }
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

    const storeTokensAction = storeNewTokensValueLocked(protocol, unixTimestamp, tokensBalances, hourlyTokensTvl, dailyTokensTvl);
    const storeUsdTokensAction = storeNewTokensValueLocked(protocol, unixTimestamp, usdTokenBalances, hourlyUsdTokensTvl, dailyUsdTokensTvl);
    const storeTvlAction = storeNewTvl(protocol, unixTimestamp, tvl);

    await Promise.all([storeTokensAction, storeUsdTokensAction, storeTvlAction])

    return;
  }
}
