import { storeTvl } from "./getAndStoreTvl";
import { getCurrentBlocks } from "./blocks";
import { getCoingeckoLock, releaseCoingeckoLock } from "../utils/shared/coingeckoLocks";
import { TokenPrices } from "../types";
import protocols from "../protocols/data";
import { importAdapter } from "../utils/imports/importAdapter";

const maxRetries = 4;

async function iterateProtocols(
  protocolIndexes:number[]
) {
  console.log("preblocks")
  const { timestamp, ethereumBlock, chainBlocks } = await getCurrentBlocks();
  console.log("blocks", chainBlocks)
  const knownTokenPrices = {} as TokenPrices;
  const actions = protocolIndexes
    .map(idx=>protocols[idx])
    .map((protocol) =>{
      const adapterModule = importAdapter(protocol)
      return storeTvl(
        timestamp,
        ethereumBlock,
        chainBlocks,
        protocol,
        adapterModule,
        knownTokenPrices,
        maxRetries,
        getCoingeckoLock
      )
    });
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
