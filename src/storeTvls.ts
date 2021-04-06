import { wrapScheduledLambda } from "./utils/wrap";
import protocols from "./protocols/data";
import { ethers } from "ethers";
import {storeTvl} from './utils/getAndStoreTvl'

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

const handler = async () => {
  const provider = new ethers.providers.AlchemyProvider(
    "mainnet",
    process.env.ALCHEMY_API
  );
  const lastBlockNumber = await provider.getBlockNumber();
  const block = await provider.getBlock(lastBlockNumber - 10); // To allow indexers to catch up
  const knownTokenPrices = {};
  const actions = protocols.map((protocol) =>
    storeTvl(block.timestamp, block.number, protocol, knownTokenPrices, maxRetries, getCoingeckoLock)
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
