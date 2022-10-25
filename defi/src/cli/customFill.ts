require("dotenv").config();

import dynamodb from "../utils/shared/dynamodb";
import { getProtocol, } from "./utils";
import {
  dailyTokensTvl,
  dailyTvl,
  dailyUsdTokensTvl,
} from "../utils/getLastRecord";
import { getClosestDayStartTimestamp } from "../utils/date";
import { storeTvl } from "../storeTvlInterval/getAndStoreTvl";
import {
  getCoingeckoLock,
  releaseCoingeckoLock,
} from "../utils/shared/coingeckoLocks";
import type { Protocol } from "../protocols/data";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { importAdapter } from "./utils/importAdapter";
import { log } from '../../DefiLlama-Adapters/projects/helper/utils'
import axios from 'axios'

const secondsInDay = 24 * 3600;

/// ---------------- Protocol specfic code ----------------- 

const protocolToRefill = 'Portal'
const updateOnlyMissing = false
const fillBefore = dateInSec('2022-04-01')

let data = {} as { [key:  number]: any }
const adapterModule = {
  misrepresentedTokens: true,
  tvl: async (ts: number) => {
    if (!data[ts]) throw new Error('Data not found for ' + ts)
    return {
      tether: data[ts]
    }
  }
}

async function fetchData() {
  const { data: { DailyLocked } } = await axios.get('https://europe-west3-wormhole-315720.cloudfunctions.net/mainnet-notionaltvlcumulative?totalsOnly=true')
  log(Object.entries(DailyLocked).length)
  Object.entries(DailyLocked).reverse().forEach((i: any) => {
    const date = i[0]
    const tvl = i[1]['*']['*'].Notional
    const timestamp = getClosestDayStartTimestamp(dateInSec(date))
    if (timestamp > fillBefore) return;
    if (!tvl) return;
    data[timestamp] = tvl
  })
}
// ---------------- Protocol specfic code ----------------- 

function dateInSec(str: any) {
  return (+new Date(str)) / 1000
}

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

async function getAndStore(
  timestamp: number,
  protocol: Protocol,
  dailyItems: DailyItems
) {
  let ethereumBlock = 1e15, chainBlocks = {} // we set ethereum block to absurd number and it will be ignored
  // const adapterModule = await importAdapter(protocol)
  const tvl = await storeTvl(
    timestamp,
    ethereumBlock,
    chainBlocks,
    protocol,
    adapterModule,
    {},
    4,
    getCoingeckoLock,
    false,
    false,
    true,
    () => deleteItemsOnSameDay(dailyItems, timestamp)
  );
  console.log(timestamp, new Date(timestamp * 1000).toDateString(), tvl);
}

function getDailyItems(pk: string) {
  return dynamodb
    .query({
      ExpressionAttributeValues: {
        ":pk": pk,
      },
      KeyConditionExpression: "PK = :pk",
    })
    .then((res) => res.Items);
}

const main = async () => {
  await fetchData()
  const timestamps = Object.keys(data)
  log('Total days to be filled: ', timestamps.length)
  const protocol = getProtocol(protocolToRefill);
  const dailyTvls = await getDailyItems(dailyTvl(protocol.id));
  const dailyTokens = await getDailyItems(dailyTokensTvl(protocol.id));
  const dailyUsdTokens = await getDailyItems(dailyUsdTokensTvl(protocol.id));
  const dailyItems = [dailyTvls, dailyTokens, dailyUsdTokens];
  
  // dont overwrite existing data if it is present
  if (updateOnlyMissing)
    dailyTvls?.map(i => i.SK).forEach((i) => delete data[+i])

  setInterval(() => {
    releaseCoingeckoLock();
  }, 1.5e3);

  for (const timestamp of timestamps) {
    await getAndStore(+timestamp, protocol, dailyItems)
  }
};
main().then(() => {
  log('Done!!!')
  process.exit(0)
})
