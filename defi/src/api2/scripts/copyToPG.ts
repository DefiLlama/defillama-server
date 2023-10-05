
import { PromisePool } from "@supercharge/promise-pool";
import {
  dailyTokensTvl,
  dailyTvl,
  dailyUsdTokensTvl,
  dailyRawTokensTvl,
} from "../../utils/getLastRecord";
import { getHistoricalValues } from "../../utils/shared/dynamodb";


import {  sequelize, TABLES } from '../db/index'

import protocols from "../../protocols/data";
import { transformDDBToPGFormat } from "../utils";
import entities from "../../protocols/entities";
import treasuries from "../../protocols/treasury";

let doneIndex = 0

const keyToRecord: any = {
  dailyTvl: { ddb: dailyTvl, pg: TABLES.DAILY_TVL },
  dailyTokensTvl: { ddb: dailyTokensTvl, pg: TABLES.DAILY_TOKENS_TVL },
  dailyUsdTokensTvl: { ddb: dailyUsdTokensTvl, pg: TABLES.DAILY_USD_TOKENS_TVL },
  dailyRawTokensTvl: { ddb: dailyRawTokensTvl, pg: TABLES.DAILY_RAW_TOKENS_TVL },
};

async function main() {
  await sequelize.sync()
  
  const items = [protocols, entities, treasuries].flat()
  shuffleArray(items)
  console.log('Total Items', items.length)
  await PromisePool.withConcurrency(21)
  .for(items)
  .process(copyProtocolData);
}

main().catch(console.error).then(() => {
  console.log('Done')
  process.exit(0)
})

async function copyProtocolData(protocol: any) {
  const id = protocol.id
  await Promise.all(Object.keys(keyToRecord).map(copyData))

  async function copyData(key: string) {
    const { ddb, pg } = keyToRecord[key]
    const items = await getHistoricalValues(ddb(id))
    const transformedItems = items.map((i: any) => transformDDBToPGFormat(i))
    await pg.bulkCreate(transformedItems, {
      updateOnDuplicate: ['timestamp', 'data'], // Specify the columns to update if the record already exists
      upsert: true, // Enable upsert mode
    })
    doneIndex++
    console.log(Math.floor(doneIndex/4), protocol.name, key, items.length, ddb(id))
  }
}


function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
