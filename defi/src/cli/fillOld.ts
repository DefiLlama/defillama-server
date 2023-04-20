require("dotenv").config();

import dynamodb from "../utils/shared/dynamodb";
import { getProtocol, } from "./utils";
import { getBlocksRetry } from "../storeTvlInterval/blocks";
import {
  dailyTokensTvl,
  dailyTvl,
  dailyUsdTokensTvl,
} from "../utils/getLastRecord";
import { getHistoricalValues } from "../utils/shared/dynamodb";
import { getClosestDayStartTimestamp } from "../utils/date";
import { storeTvl } from "../storeTvlInterval/getAndStoreTvl";
import {
  getCoingeckoLock,
  releaseCoingeckoLock,
} from "../utils/shared/coingeckoLocks";
import type { Protocol } from "../protocols/data";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { importAdapter } from "./utils/importAdapter";
import * as sdk from '@defillama/sdk'
import { clearProtocolCacheById } from "./utils/clearProtocolCache";

const { humanizeNumber: { humanizeNumber } } = sdk.util
const secondsInDay = 24 * 3600;

type DailyItems = (DocumentClient.ItemList | undefined)[];
async function deleteItemsOnSameDay(dailyItems: DailyItems, timestamp: number) {
  for (const items of dailyItems) {
    const itemsOnSameDay =
      items?.filter(
        (item) => getClosestDayStartTimestamp(item.SK) === timestamp
      ) ?? [];
    for (const item of itemsOnSameDay) {
      await dynamodb.delete({
        Key: {
          PK: item.PK,
          SK: item.SK,
        },
      });
    }
  }
}

type ChainBlocks = {
  [chain: string]: number;
}
let failed = 0

const IS_DRY_RUN = !!process.env.DRY_RUN

async function getAndStore(
  timestamp: number,
  protocol: Protocol,
  dailyItems: DailyItems
) {
  if (failed > 3) {
    console.log('More than 3 failures in a row, exiting now')
    process.exit(0)
  }
  const adapterModule = await importAdapter(protocol)
  let ethereumBlock = undefined, chainBlocks: ChainBlocks = {}
  if (!process.env.SKIP_BLOCK_FETCH) {
    const res = await getBlocksRetry(timestamp, { adapterModule })
    ethereumBlock = res.ethereumBlock
    chainBlocks = res.chainBlocks
  }

  const tvl: any = await storeTvl(
    timestamp,
    ethereumBlock as unknown as number,
    chainBlocks,
    protocol,
    adapterModule,
    {},
    4,
    getCoingeckoLock,
    false,
    false,
    true,
    () => deleteItemsOnSameDay(dailyItems, timestamp),
    {
      returnCompleteTvlObject: true
    }
  );

  //  sdk.log(tvl);
  if (typeof tvl === 'object') {
    Object.entries(tvl).forEach(([key, val]) => sdk.log(key, humanizeNumber((val ?? 0) as number)))
  }

  const finalTvl = typeof tvl.tvl === "number" ? humanizeNumber(tvl.tvl) : tvl.tvl

  console.log(timestamp, new Date(timestamp * 1000).toDateString(), finalTvl);
  if (tvl === undefined) failed++
  else failed = 0
}

const main = async () => {
  console.log('DRY RUN: ', IS_DRY_RUN)
  const protocolToRefill = process.argv[2]
  const latestDate = (process.argv[3] ?? "now") === "now" ? undefined : Number(process.argv[3]); // undefined -> start from today, number => start from that unix timestamp
  const batchSize = Number(process.argv[4] ?? 1); // how many days to fill in parallel
  if (process.env.HISTORICAL !== "true") {
    throw new Error(`You must set HISTORICAL="true" in your .env`)
  }
  const protocol = getProtocol(protocolToRefill);
  const adapter = await importAdapter(protocol);
  if (adapter.timetravel === false) {
    throw new Error("Adapter doesn't support refilling");
  }
  let dailyItems: any = []

  if (!IS_DRY_RUN)
    dailyItems = await Promise.all([
      getHistoricalValues(dailyTvl(protocol.id)),
      getHistoricalValues(dailyTokensTvl(protocol.id)),
      getHistoricalValues(dailyUsdTokensTvl(protocol.id)),
    ]);
  const start = adapter.start ?? 0;
  const now = Math.round(Date.now() / 1000);
  let timestamp = getClosestDayStartTimestamp(latestDate ?? now);
  if (timestamp > now) {
    timestamp = getClosestDayStartTimestamp(timestamp - secondsInDay);
  }
  setInterval(() => {
    releaseCoingeckoLock();
  }, 1.5e3);
  let atLeastOneUpdateSuccessful = false

  try {
    while (timestamp > start) {
      const batchedActions = [];
      for (let i = 0; i < batchSize && timestamp > start; i++) {
        batchedActions.push(getAndStore(timestamp, protocol, dailyItems));
        timestamp = getClosestDayStartTimestamp(timestamp - secondsInDay);
      }
      await Promise.all(batchedActions);
      atLeastOneUpdateSuccessful = true
    }
  } catch (e) {
    console.error(e)
  }

  if (!IS_DRY_RUN && atLeastOneUpdateSuccessful)
    return clearProtocolCacheById(protocol.id)

};
main().then(() => {
  console.log('Done!!!')
  process.exit(0)
})

