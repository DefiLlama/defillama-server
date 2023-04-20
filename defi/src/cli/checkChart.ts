require("dotenv").config();
import protocols from "../protocols/data";
import dynamodb from "../utils/shared/dynamodb";
import { getClosestDayStartTimestamp } from "../utils/date";
import { storeTvl } from "../storeTvlInterval/getAndStoreTvl";
import { getBlocksRetry } from "../storeTvlInterval/blocks";
import {
  getCoingeckoLock,
  releaseCoingeckoLock,
} from "../utils/shared/coingeckoLocks";
import { dailyTvl, dailyTokensTvl, dailyUsdTokensTvl } from "../utils/getLastRecord";
import { date } from './utils'
import { importAdapter } from "./utils/importAdapter";

const projectsToRefill: string[] = ["Trader Joe"];
const notify = false;
const deleteRepeated = true;
const extrapolate = false;

const secondsInDay = 86400;
async function main() {
  if(process.env.HISTORICAL !== "true"){
    throw new Error(`You must set HISTORICAL="true" in your .env`)
  }
  if (projectsToRefill.length > 0) {
    setInterval(() => {
      releaseCoingeckoLock();
    }, 1e3);
  }
  for (const tvlPrefix of [dailyTvl, dailyTokensTvl, dailyUsdTokensTvl]) {
    console.log(`# ${tvlPrefix('')}`)
    await Promise.all(
      protocols.map(async (protocol) => {
        const historicalTvl = await dynamodb.query({
          ExpressionAttributeValues: {
            ":pk": tvlPrefix(protocol.id),
          },
          KeyConditionExpression: "PK = :pk",
        });
        if (historicalTvl.Items !== undefined && historicalTvl.Items.length > 0) {
          const items = historicalTvl.Items;
          let lastItemDate = getClosestDayStartTimestamp(items[items.length - 1].SK);
          for (let i = items.length - 2; i >= 0; i--) {
            const item = items[i];
            const timestamp = getClosestDayStartTimestamp(item.SK);
            const diff = lastItemDate - timestamp;
            const under = diff < secondsInDay * 0.5;
            const over = diff > secondsInDay * 1.5;
            const protocolIsSelected = projectsToRefill.includes(protocol.name)
            if ((over || under) && notify) {
              if (projectsToRefill.length === 0 || protocolIsSelected) {
                console.log(
                  protocol.name.padEnd(19, " "),
                  diff / secondsInDay,
                  date(timestamp),
                  date(lastItemDate)
                );
              }
            }
            if (!notify && over && protocolIsSelected) {
              let nextTimestamp = lastItemDate;
              do {
                nextTimestamp = getClosestDayStartTimestamp(
                  nextTimestamp - secondsInDay
                );
                let tvl;
                if (extrapolate) {
                  throw new Error("Extrapolation is bad, removign this error if you want to continue anyway")
                  const totalTimeDiff = items[i + 1].SK - item.SK;
                  tvl =
                    (item.tvl * (items[i + 1].SK - nextTimestamp) +
                      items[i + 1].tvl * (nextTimestamp - item.SK)) /
                    totalTimeDiff;
                  await dynamodb.put({
                    PK: tvlPrefix(protocol.id),
                    SK: nextTimestamp,
                    tvl,
                  });
                } else {
                  const adapterModule = await importAdapter(protocol)
                  const { ethereumBlock, chainBlocks } = await getBlocksRetry(
                    nextTimestamp, { adapterModule },
                  );
                  tvl = await storeTvl(
                    nextTimestamp,
                    ethereumBlock,
                    chainBlocks,
                    protocol,
                    adapterModule,
                    {},
                    4,
                    getCoingeckoLock,
                    false,
                    false,
                    true
                  );
                }
                console.log(protocol.name, date(nextTimestamp), tvl);
              } while (nextTimestamp > timestamp);
            }
            if (under && deleteRepeated) {
              console.log("Delete", protocol.name, timestamp);
              await dynamodb.delete({
                Key: {
                  PK: item.PK,
                  SK: item.SK,
                },
              });
            }
            lastItemDate = timestamp;
          }
        }
      })
    );
  }
}
main();
