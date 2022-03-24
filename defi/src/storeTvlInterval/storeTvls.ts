import { storeTvl } from "./getAndStoreTvl";
import { getCurrentBlocks } from "@defillama/sdk/build/computeTVL/blocks";
import { getCoingeckoLock, releaseCoingeckoLock } from "../utils/shared/coingeckoLocks";
import { TokenPrices } from "../types";
import protocols from "../protocols/data";

const maxRetries = 1;

async function iterateProtocols(
  protocolIndexes:number[]
) {
  const { timestamp, ethereumBlock, chainBlocks } = await getCurrentBlocks();
  const knownTokenPrices = {} as TokenPrices;
  const actions = protocolIndexes
    .map(idx=>protocols[idx])
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
}

export default async (protocolIndexes:number[]) => {
  await iterateProtocols(protocolIndexes);
};
