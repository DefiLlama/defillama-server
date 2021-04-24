import { getCurrentBlocks } from "@defillama/sdk/build/computeTVL/blocks";
import { getCoingeckoLock, releaseCoingeckoLock } from "./coingeckoLocks"
import { TokenPrices } from "../types";
import protocols, { Protocol } from "../protocols/data";

const maxRetries = 4;

type ProtocolDataProcessor = (
  unixTimestamp: number,
  ethBlock: number,
  chainBlocks: {
    [chain: string]: number;
  },
  protocol: Protocol,
  knownTokenPrices: TokenPrices,
  maxRetries: number,
  getCoingeckoLock?: () => Promise<unknown>
) => void


export default async function iterateProtocols(processor: ProtocolDataProcessor, start: number, end: number) {
  const { timestamp, ethereumBlock, chainBlocks } = await getCurrentBlocks();
  const knownTokenPrices = {};
  const actions = protocols
    .slice(start, end)
    .map((protocol) =>
      processor(
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
