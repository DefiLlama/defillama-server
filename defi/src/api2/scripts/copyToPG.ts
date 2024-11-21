require("dotenv").config();
import { PromisePool } from "@supercharge/promise-pool";
import {
  dailyTokensTvl, dailyTvl, dailyUsdTokensTvl, dailyRawTokensTvl,
  hourlyTokensTvl, hourlyTvl, hourlyUsdTokensTvl, hourlyRawTokensTvl,
} from "../../utils/getLastRecord";
import { getHistoricalValues } from "../../utils/shared/dynamodb";


import { TABLES, initializeTVLCacheDB } from '../db/index'

import protocols from "../../protocols/data";
import { transformDDBToPGFormat } from "../utils";
import entities from "../../protocols/entities";
import treasuries from "../../protocols/treasury";
import { shuffleArray } from "../../utils/shared/shuffleArray";

// NOTE: set tableName env for aws

let doneIndex = 0

const keyToRecord: any = {
  dailyTvl: { ddb: dailyTvl, pg: TABLES.DAILY_TVL },
  dailyTokensTvl: { ddb: dailyTokensTvl, pg: TABLES.DAILY_TOKENS_TVL },
  dailyUsdTokensTvl: { ddb: dailyUsdTokensTvl, pg: TABLES.DAILY_USD_TOKENS_TVL },
  dailyRawTokensTvl: { ddb: dailyRawTokensTvl, pg: TABLES.DAILY_RAW_TOKENS_TVL },
  /* hourlyTvl: { ddb: hourlyTvl, pg: TABLES.HOURLY_TVL },
  hourlyTokensTvl: { ddb: hourlyTokensTvl, pg: TABLES.HOURLY_TOKENS_TVL },
  hourlyUsdTokensTvl: { ddb: hourlyUsdTokensTvl, pg: TABLES.HOURLY_USD_TOKENS_TVL },
  hourlyRawTokensTvl: { ddb: hourlyRawTokensTvl, pg: TABLES.HOURLY_RAW_TOKENS_TVL }, */
};
const keyCount = Object.keys(keyToRecord).length

async function copyAll() {
  await initializeTVLCacheDB()

  const items = [protocols, entities, treasuries].flat()
  // .filter((p: any) => p.id === '308')
  shuffleArray(items)
  console.log('Total Items', items.length)
  await PromisePool.withConcurrency(21)
    .for(items)
    .process(copyProtocolData);
}


async function copyFiltered() {
  await initializeTVLCacheDB()

  const items = protocols
    .filter((p: any) => p.id === '4293')
    // .filter((p: any) => p.category === 'CEX')
  shuffleArray(items)
  console.log('Total Items', items.length)
  await PromisePool.withConcurrency(5)
    .for(items)
    .process(copyProtocolData);
}

copyFiltered().catch(console.error).then(() => {
  console.log('Done')
  process.exit(0)
})

async function copyProtocolData(protocol: any) {
  try {

    const id = protocol.id
    await Promise.all(Object.keys(keyToRecord).map(copyData))

    async function copyData(key: string) {
      const { ddb, pg } = keyToRecord[key]
      const items = await getHistoricalValues(ddb(id))
      let transformedItems = items.map((i: any) => transformDDBToPGFormat(i))
      const oItems: any = {}
      transformedItems.forEach((i: any) => {
        if (!oItems[i.timeS]) oItems[i.timeS] = []
        oItems[i.timeS].push(i)
      })
      // we remove duplicates here else we get error from pg
      transformedItems = [...Object.values(oItems).map((i: any) => i[0])]
      const i = await pg.bulkCreate(transformedItems, {
        updateOnDuplicate: ['timestamp', 'data'], // Specify the columns to update if the record already exists
        upsert: true, // Enable upsert mode
      })
      doneIndex++
      console.log(Math.floor(doneIndex / keyCount), protocol.name, key, items.length, i.length, ddb(id))
    }
  } catch (e) {
    console.error(e)
  }
}
