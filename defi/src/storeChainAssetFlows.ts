import chainAssetFlows from "../l2/flows";
import { sendMessage } from "./utils/discord";
import { withTimeout } from "./utils/shared/withTimeout";
import setEnvSecrets from "./utils/shared/setEnvSecrets";
import { getCurrentUnixTimestamp } from "./utils/date";
import { storeHistoricalFlows } from "../l2/storeToDb";
import { ChainTokens } from "../l2/types";
import PromisePool from "@supercharge/promise-pool";

async function getChainAssetFlows() {
  const timestamp = getCurrentUnixTimestamp();
  const res: ChainTokens = await chainAssetFlows(timestamp);
  await storeHistoricalFlows(res, timestamp);
  console.log("chain asset flows stored");
  process.exit();
}
export async function handler() {
  try {
    await setEnvSecrets();
    await withTimeout(8400000, getChainAssetFlows()); // 140 mins
  } catch (e) {
    process.env.CHAIN_ASSET_WEBHOOK ? await sendMessage(`${e}`, process.env.CHAIN_ASSET_WEBHOOK!) : console.log(e);
    process.exit();
  }
}
handler();

async function backfill(timestamp: number) {
  const res: ChainTokens = await chainAssetFlows(timestamp);
  await storeHistoricalFlows(res, timestamp);
  console.log(`${timestamp} stored`);
}
async function main() {
  let start = 1711926000; // 1 Apr
  const end = getCurrentUnixTimestamp();
  const timestamps = [];
  while (start < end) {
    timestamps.push(start);
    start += 3600; // 1hr
  }
  await PromisePool.withConcurrency(5)
    .for(timestamps)
    .process((t) => backfill(t))
    .catch((e) => {
      e;
    });
  console.log("done");
}
// main();
// ts-node defi/src/storeChainAssetFlows.ts
