import { wrapScheduledLambda } from "./utils/wrap";
import protocols, { Protocol } from "./protocols/data";
import * as Sentry from "@sentry/serverless";
import { ethers } from "ethers";
import { util } from "@defillama/sdk";
import storeNewTvl from "./utils/storeNewTvl";

const maxRetries = 4;

const locks = [] as ((value: unknown) => void)[];
function getCoingeckoLock() {
  return new Promise((resolve) => {
    locks.push(resolve);
  });
}
function releaseCoingeckoLock() {
  const firstLock = locks.shift();
  if (firstLock !== undefined) {
    firstLock(null);
  }
}

interface TokenPrices {
  [token: string]: {
    usd: number;
  };
}

async function storeTvl(
  unixTimestamp: number,
  ethBlock: number,
  protocol: Protocol,
  knownTokenPrices: TokenPrices
) {
  for (let i = 0; i < maxRetries; i++) {
    let tvl: number;
    try {
      const module = await import(
        `../DefiLlama-Adapters/projects/${protocol.module}`
      );
      if (module.tvl) {
        const tvlBalances = await module.tvl(unixTimestamp, ethBlock);
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
        Sentry.AWSLambda.captureException(e);
        return;
      } else {
        continue;
      }
    }
    await storeNewTvl(protocol, unixTimestamp, tvl);
    return;
  }
}

const handler = async () => {
  const provider = new ethers.providers.AlchemyProvider(
    "mainnet",
    process.env.ALCHEMY_API
  );
  const lastBlockNumber = await provider.getBlockNumber();
  const block = await provider.getBlock(lastBlockNumber - 10); // To allow indexers to catch up
  const knownTokenPrices = {};
  const actions = protocols.map((protocol) =>
    storeTvl(block.timestamp, block.number, protocol, knownTokenPrices)
  );
  const timer = setInterval(() => {
    // Rate limit is 100 calls/min for coingecko's API
    // So we'll release one every 0.6 seconds to match it
    releaseCoingeckoLock();
  }, 600);
  await Promise.all(actions);
  clearInterval(timer);
  return;
};

export default wrapScheduledLambda(handler);
