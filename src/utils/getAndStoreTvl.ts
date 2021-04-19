import { Protocol } from "../protocols/data";
import { util } from "@defillama/sdk";
import storeNewTvl from "./storeNewTvl";
import * as Sentry from "@sentry/serverless";

export interface TokenPrices {
    [token: string]: {
      usd: number;
    };
  }

export async function storeTvl(
    unixTimestamp: number,
    ethBlock: number,
    chainBlocks: {
      [chain:string]:number
    },
    protocol: Protocol,
    knownTokenPrices?: TokenPrices,
    maxRetries: number = 1,
    getCoingeckoLock?: ()=>Promise<unknown>
  ) {
    for (let i = 0; i < maxRetries; i++) {
      let tvl: number;
      try {
        const module = await import(
          `../../DefiLlama-Adapters/projects/${protocol.module}`
        );
        if (module.tvl) {
          const tvlBalances = await module.tvl(unixTimestamp, ethBlock, chainBlocks);
          tvl = await util.computeTVL(
            tvlBalances,
            "now",
            false,
            knownTokenPrices,
            getCoingeckoLock,
            10
          );
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
      try{
        await storeNewTvl(protocol, unixTimestamp, tvl);
      } catch(e){
        const scope = new Sentry.Scope();
        scope.setTag("protocol", protocol.name);
        Sentry.AWSLambda.captureException(e, scope);
      }
      return;
    }
  }