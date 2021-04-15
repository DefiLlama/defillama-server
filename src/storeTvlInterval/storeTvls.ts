import protocols from "../protocols/data";
import { ethers } from "ethers";
import {storeTvl} from '../utils/getAndStoreTvl'
import {getCurrentBlocks} from "@defillama/sdk/build/computeTVL/index"

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

export default async (intervalStart:number, intervalEnd:number) => {
  const {timestamp, ethereumBlock, chainBlocks} = await getCurrentBlocks()
  const knownTokenPrices = {};
  const actions = protocols.slice(intervalStart, intervalEnd).map((protocol) =>
    storeTvl(timestamp, ethereumBlock, chainBlocks, protocol, knownTokenPrices, maxRetries, getCoingeckoLock)
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