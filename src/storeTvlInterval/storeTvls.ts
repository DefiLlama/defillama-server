import protocols from "../protocols/data";
import { storeTvl } from "./getAndStoreTvl";
import { getCurrentBlocks } from "@defillama/sdk/build/computeTVL/blocks";
import { getCoingeckoLock, releaseCoingeckoLock } from "./coingeckoLocks";

const maxRetries = 4;

export default async (intervalStart: number, intervalEnd: number) => {
  const { timestamp, ethereumBlock, chainBlocks } = await getCurrentBlocks();
  const knownTokenPrices = {};
  const actions = protocols
    .slice(intervalStart, intervalEnd)
    .map((protocol) =>
      storeTvl(
        timestamp,
        ethereumBlock,
        chainBlocks,
        protocol,
        knownTokenPrices,
        maxRetries,
        getCoingeckoLock
      )
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
