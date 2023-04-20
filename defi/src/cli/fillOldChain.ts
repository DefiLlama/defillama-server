require("dotenv").config();

import dynamodb from "../utils/shared/dynamodb";
import { getProtocol, } from "./utils";
import { getBlocksRetry } from "../storeTvlInterval/blocks";
import {
  dailyTokensTvl,
  dailyTvl,
  dailyUsdTokensTvl,
  dailyRawTokensTvl,
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
import { Chain } from "@defillama/sdk/build/general";
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

async function getAndStore(
  timestamp: number,
  protocol: Protocol,
  dailyItems: DailyItems,
  options: {
    chainsToRefill: string[],
    rawTokenTvl: DocumentClient.ItemList
  }
) {
  const { chainsToRefill, rawTokenTvl = [] } = options
  const cacheData = rawTokenTvl.find(
    (item) => getClosestDayStartTimestamp(item.SK) === timestamp
  )
  if (!cacheData) {
    console.log('Unable to find cached data for: ', new Date(timestamp * 1000).toDateString())
    process.exit(0)
  }
  if (failed > 3) {
    console.log('More than 3 failures in a row, exiting now')
    process.exit(0)
  }
  const adapterModule = await importAdapter(protocol)

  let ethereumBlock = undefined, chainBlocks: ChainBlocks = {}
  const chains = chainsToRefill.map(i => i.split('-')[0])

  for (const chain of chains)
    if (!adapterModule[chain]) throw new Error('Protocol does not have that chain!')

  const res = await getBlocksRetry(timestamp, { chains: [...new Set(chains)] as Chain[] })
  ethereumBlock = res.ethereumBlock
  chainBlocks = res.chainBlocks

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
      chainsToRefill,
      partialRefill: true,
      returnCompleteTvlObject: true,
      cacheData,
    }
  );
  if (typeof tvl === 'object') {
    Object.entries(tvl).forEach(([key, val]) => sdk.log(key, humanizeNumber((val ?? 0) as number)))
  }

  const finalTvl = typeof tvl.tvl === "number" ? humanizeNumber(tvl.tvl) : tvl.tvl

  console.log(timestamp, new Date(timestamp * 1000).toDateString(), finalTvl);
  if (tvl === undefined) failed++
  else failed = 0
}

const main = async () => {
  sdk.log('DRY RUN: ', !!process.env.DRY_RUN)
  sdk.log('Refilling protocol: ', process.argv[2])
  sdk.log('Refilling for keys: ', process.argv[3].split(','))
  const protocolToRefill = process.argv[2]
  const chainsToRefill = process.argv[3].split(',')
  const latestDate = (process.argv[4] ?? "now") === "now" ? undefined : Number(process.argv[3]); // undefined -> start from today, number => start from that unix timestamp
  const batchSize = Number(process.argv[5] ?? 1); // how many days to fill in parallel
  if (process.env.HISTORICAL !== "true") {
    throw new Error(`You must set HISTORICAL="true" in your .env`)
  }

  if (!chainsToRefill) throw new Error('Missing chain parameter')
  const protocol = getProtocol(protocolToRefill);
  const adapter = await importAdapter(protocol);
  const chains = chainsToRefill.map(i => i.split('-')[0])

  for (const chain of chains)
    if (!adapter[chain]) throw new Error('Protocol does not have the chain:' + chain)

  const data = await Promise.all([
    getHistoricalValues(dailyRawTokensTvl(protocol.id)),
    getHistoricalValues(dailyTvl(protocol.id)),
    getHistoricalValues(dailyTokensTvl(protocol.id)),
    getHistoricalValues(dailyUsdTokensTvl(protocol.id)),
  ]);
  const [ rawTokenTvl, ...dailyItems] = data
  // const [dailyTvls, dailyTokens, dailyUsdTokens, ] = dailyItems
  // debugPrintDailyItems(dailyTvls, 'dailyTvls')
  // debugPrintDailyItems(dailyTokens, 'dailyTokens')
  // debugPrintDailyItems(dailyUsdTokens, 'dailyUsdTokens')
  // debugPrintDailyItems(rawTokenTvl, 'rawTokenTvl')
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
        batchedActions.push(getAndStore(timestamp, protocol, dailyItems, { chainsToRefill, rawTokenTvl } as any));
        timestamp = getClosestDayStartTimestamp(timestamp - secondsInDay);
      }
      await Promise.all(batchedActions);
      atLeastOneUpdateSuccessful = true
    }
  } catch (e) {
    console.error(e)
  }

  if (!process.env.DRY_RUN && atLeastOneUpdateSuccessful)
    return clearProtocolCacheById(protocol.id)
};

main().then(() => {
  console.log('Done!!!')
  process.exit(0)
})

function debugPrintDailyItems(items: any[] = [], key = '') {
  sdk.log('Data for ', key)
  sdk.log('length ', items.length)
  return;
  items = [...items].map(i => i.SK)
  items.sort((a, b) => b - a)
  items = items.slice(0, 32)
  sdk.log(JSON.stringify(items?.map(i => new Date(1e3 * i).toDateString()), null, 2))
}

