import dynamodb from "../utils/dynamodb";
import { getProtocol } from "./utils";
import { dailyTvl } from "../utils/getLastRecord";
import { getClosestDayStartTimestamp } from "../date/getClosestDayStartTimestamp";
import { storeTvl } from "../storeTvlInterval/getAndStoreTvl";
import { getBlocks } from "@defillama/sdk/build/computeTVL/blocks";
import {
  getCoingeckoLock,
  releaseCoingeckoLock,
} from "../storeTvlUtils/coingeckoLocks";
import type { Protocol } from "../protocols/data";

const secondsInDay = 24 * 3600;
async function getBlocksRetry(timestamp: number) {
  for (let i = 0; i < 5; i++) {
    try {
      return await getBlocks(timestamp);
    } catch (e) {}
  }
  throw new Error(`rekt at ${timestamp}`);
}

async function getFirstDate(protocolId: string) {
  const dailyTvls = await dynamodb.query({
    ExpressionAttributeValues: {
      ":pk": dailyTvl(protocolId),
    },
    KeyConditionExpression: "PK = :pk",
  });
  return getClosestDayStartTimestamp(
    dailyTvls.Items![0].SK ?? Math.round(Date.now() / 1000)
  );
}
async function getAndStore(timestamp: number, protocol: Protocol) {
  const { ethereumBlock, chainBlocks } = await getBlocksRetry(timestamp);
  const tvl = await storeTvl(
    timestamp,
    ethereumBlock,
    chainBlocks,
    protocol,
    {},
    4,
    getCoingeckoLock,
    false,
    false
  );
  if(tvl === 0){
    throw new Error(`Returned 0 TVL at timestamp ${timestamp} (eth block ${ethereumBlock})`)
  }
  console.log(timestamp, ethereumBlock);
}
const batchSize = 5;

const main = async () => {
  const protocol = getProtocol("basketdao");
  const adapter = await import(
    `../../DefiLlama-Adapters/projects/${protocol.module}`
  );
  const start = adapter.start ?? 0;
  let timestamp = getClosestDayStartTimestamp(Math.round(Date.now() / 1000));
  setInterval(() => {
    releaseCoingeckoLock();
  }, 1e3);
  while (timestamp > start) {
    const batchedActions = [];
    for (let i = 0; i < batchSize && timestamp > start; i++) {
      batchedActions.push(getAndStore(timestamp, protocol));
      timestamp = getClosestDayStartTimestamp(timestamp - secondsInDay);
    }
    await Promise.all(batchedActions);
  }
};
main();
