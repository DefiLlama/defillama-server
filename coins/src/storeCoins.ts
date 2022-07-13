import { storeCoin } from "./storeCoin";
import {
  getCoingeckoLock,
  releaseCoingeckoLock
} from "../src/utils/shared/coingeckoLocks";
import protocols from "./protocols/data";
import { importAdapter } from "./protocols/importAdapter";

const maxRetries = 4;

async function iterateProtocols(protocolIndexes: number[]) {
  const actions = protocolIndexes
    .map((idx) => protocols[idx])
    .map((protocol) => {
      const adapterModule = importAdapter(protocol);
      console.log("a");
      //return storeCoin(adapterModule, getCoingeckoLock);
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

export default async (protocolIndexes: number[]) => {
  await iterateProtocols(protocolIndexes);
};
