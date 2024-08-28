import * as sdk from "@defillama/sdk"
import { Tables } from "../../api2/db/tables"
import dynamodb from "../../utils/shared/dynamodb"
import { initializeTVLCacheDB } from "../../api2/db"
import { AdapterRecord2 } from "./AdapterRecord2"
import { AdapterType } from "@defillama/dimension-adapters/adapters/types"
import { Op, } from "sequelize"
import { sliceIntoChunks } from "@defillama/sdk/build/util"
import { IJSON } from "../data/types"

let isInitialized: any

async function init() {
  if (!isInitialized) isInitialized = initializeTVLCacheDB()
  return isInitialized
}

export async function storeAdapterRecord(record: AdapterRecord2, retriesLeft = 3) {
  try {

    await init()

    const pgItem = record.getPGItem()
    const hourlyDDbItem = record.getHourlyDDBItem()
    const ddbItem = record.getDDBItem()

    await Promise.all([
      Tables.DIMENSIONS_DATA.upsert(pgItem),
      dynamodb.putDimensionsData(ddbItem),
      dynamodb.putDimensionsData(hourlyDDbItem),
    ])
  } catch (error) {
    if (retriesLeft > 0) {
      console.error('Error writing to ddb, retrying...', retriesLeft, record.id)
      await new Promise(resolve => setTimeout(resolve, 1000)) // wait for 1 second
      await storeAdapterRecord(record, retriesLeft - 1)
    } else {
      console.error('Error writing to ddb', error)
      throw error
    }
  }
}

// used for migration from old db
export async function storeAdapterRecordBulk(records: AdapterRecord2[]) {
  const recordMap: IJSON<AdapterRecord2> = {}
  records.map(i => recordMap[i.getUniqueKey()] = i)
  records = Object.values(recordMap)


  await init()

  const pgItems = records.map(record => record.getPGItem())
  const ddbItems = records.map(record => record.getDDBItem())
  // console.log('storing', ddbItems.length, 'records', JSON.stringify(ddbItems.slice(0, 4), null, 2))

  // console.log('storing', pgItems.length, 'records', pgItems[0])
  // console.log('storing', ddbItems.length, 'records', ddbItems[0])


  // you can write max 25 items at a time to dynamodb
  const ddbChunks = sliceIntoChunks(ddbItems, 25)
  for (const chunk of ddbChunks) {
    await writeChunkToDDB(chunk)
  }

  await Tables.DIMENSIONS_DATA.bulkCreate(pgItems, {
    updateOnDuplicate: ['timestamp', 'data', 'type']
  });

  async function writeChunkToDDB(chunk: any, retriesLeft = 3) {
    try {
      await dynamodb.putDimensionsDataBulk(chunk)
    } catch (error) {
      if (retriesLeft > 0) {
        console.error('Error writing to ddb, retrying...', chunk.length, chunk[0]?.id)
        const randomWait = Math.random() * 2000 + 1000
        await new Promise(resolve => setTimeout(resolve, randomWait)) // wait for 1-3 seconds
        await writeChunkToDDB(chunk, retriesLeft - 1)
      } else {
        console.error('Error writing to ddb', error)
        throw error
      }
    }
  }
}

export async function getAllItemsUpdatedAfter({ adapterType, timestamp }: { adapterType: AdapterType, timestamp: number}) {
  await init()
  if (timestamp < 946684800) timestamp = 946684800 // 2000-01-01

  const label = `getAllItemsUpdatedAfter(${adapterType})`
  console.time(label)

  const result: any = await Tables.DIMENSIONS_DATA.findAll({
    where: { type: adapterType, updatedat: { [Op.gte]: timestamp  } },
    attributes: ['data', 'timestamp', 'id', 'timeS'],
    raw: true,
    order: [['timestamp', 'ASC']],
  })

  sdk.log(`getAllItemsUpdatedAfter(${adapterType}) found ${result.length} items updated after ${new Date(timestamp * 1000)}`)
  console.timeEnd(label)
  return result
}