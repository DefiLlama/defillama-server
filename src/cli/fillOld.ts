import dynamodb from "../utils/dynamodb";
import { getProtocol } from "./utils";
import { dailyTokensTvl, dailyTvl, dailyUsdTokensTvl } from "../utils/getLastRecord";
import { getClosestDayStartTimestamp } from "../date/getClosestDayStartTimestamp";
import { storeTvl } from "../storeTvlInterval/getAndStoreTvl";
import { getBlocks } from "@defillama/sdk/build/computeTVL/blocks";
import {
  getCoingeckoLock,
  releaseCoingeckoLock,
} from "../storeTvlUtils/coingeckoLocks";
import type { Protocol } from "../protocols/data";
import { DocumentClient } from "aws-sdk/clients/dynamodb";

const secondsInDay = 24 * 3600;
async function getBlocksRetry(timestamp: number) {
  for (let i = 0; i < 5; i++) {
    try {
      return await getBlocks(timestamp);
    } catch (e) { }
  }
  throw new Error(`rekt at ${timestamp}`);
}

async function getFirstDate(dailyTvls: any) {
  return getClosestDayStartTimestamp(
    dailyTvls.Items![0].SK ?? Math.round(Date.now() / 1000)
  );
}

type DailyItems = (DocumentClient.ItemList | undefined)[]

async function getAndStore(timestamp: number, protocol: Protocol, dailyItems:DailyItems) {
  await deleteItemsOnSameDay(dailyItems, timestamp)
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
  if (tvl === 0) {
    throw new Error(`Returned 0 TVL at timestamp ${timestamp} (eth block ${ethereumBlock})`)
  }
  console.log(timestamp, ethereumBlock);
}
const batchSize = 7;

function getDailyItems(pk: string) {
  return dynamodb.query({
    ExpressionAttributeValues: {
      ":pk": pk,
    },
    KeyConditionExpression: "PK = :pk",
  }).then(res => res.Items);
}

async function deleteItemsOnSameDay(dailyItems: DailyItems, timestamp: number) {
  for (const items of dailyItems) {
    const itemsOnSameDay = items?.filter(item => getClosestDayStartTimestamp(item.SK) === timestamp) ?? []
    for (const item of itemsOnSameDay) {
      await dynamodb.delete({
        Key: {
          PK: item.PK,
          SK: item.SK
        }
      })
    }
  }
}

const main = async () => {
  const protocol = getProtocol("stakedao");
  const adapter = await import(
    `../../DefiLlama-Adapters/projects/${protocol.module}`
  );
  const dailyTvls = await getDailyItems(dailyTvl(protocol.id))
  const dailyTokens = await getDailyItems(dailyTokensTvl(protocol.id))
  const dailyUsdTokens = await getDailyItems(dailyUsdTokensTvl(protocol.id))
  const dailyItems = [dailyTvls, dailyTokens, dailyUsdTokens]
  const start = adapter.start ?? 0;
  const now = Math.round(Date.now() / 1000)
  let timestamp = getClosestDayStartTimestamp(now);
  if (timestamp > now) {
    timestamp = getClosestDayStartTimestamp(timestamp - secondsInDay);
  }
  setInterval(() => {
    releaseCoingeckoLock();
  }, 1e3);
  while (timestamp > start) {
    const batchedActions = [];
    for (let i = 0; i < batchSize && timestamp > start; i++) {
      batchedActions.push(getAndStore(timestamp, protocol, dailyItems));
      timestamp = getClosestDayStartTimestamp(timestamp - secondsInDay);
    }
    await Promise.all(batchedActions);
  }
};
main();
