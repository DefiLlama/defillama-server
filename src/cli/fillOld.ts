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

const main = async () => {
  const protocol = getProtocol("Stacks");
  let timestamp = getClosestDayStartTimestamp(Math.round(Date.now() / 1000));
  setInterval(() => {
    releaseCoingeckoLock();
  }, 1e3);
  while (true) {
    const { ethereumBlock, chainBlocks } = await getBlocksRetry(timestamp);
    console.log(timestamp, ethereumBlock);
    await storeTvl(
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
    timestamp = getClosestDayStartTimestamp(timestamp - secondsInDay);
  }
};
main();
