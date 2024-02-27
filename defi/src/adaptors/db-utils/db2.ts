
import { Tables } from "../../api2/db/tables"
import dynamodb from "../../utils/shared/dynamodb"
import { initializeTVLCacheDB } from "../../api2/db"
import { AdapterRecord2 } from "./AdapterRecord2"
import { AdapterType } from "@defillama/dimension-adapters/adapters/types"
import configs from "../data/configs"
import { Op, QueryTypes } from "sequelize"
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

  // console.log('storing', pgItems.length, 'records', pgItems[0])
  // console.log('storing', ddbItems.length, 'records', ddbItems[0])


  // you can write max 25 items at a time to dynamodb
  /* const ddbChunks = sliceIntoChunks(ddbItems, 25)
  for (const chunk of ddbChunks) {
    await writeChunkToDDB(chunk)
  } */

  await Tables.DIMENSIONS_DATA.bulkCreate(pgItems, {
    updateOnDuplicate: ['timestamp', 'data', 'type']
  });

  async function writeChunkToDDB(chunk: any, retriesLeft = 3) {
    try {
      await dynamodb.putDimensionsDataBulk(chunk)
    } catch (error) {
      if (retriesLeft > 0) {
        console.error('Error writing to ddb, retrying...', chunk.length, chunk[0]?.id)
        await new Promise(resolve => setTimeout(resolve, 1000)) // wait for 1 second
        await writeChunkToDDB(chunk, retriesLeft - 1)
      } else {
        console.error('Error writing to ddb', error)
        throw error
      }
    }
  }
}

export async function getItemsLastUpdated(adapterType: AdapterType) {
  await init()

  const label = `getItemsLastUpdated(${adapterType})`
  console.time(label)

  const result = await (Tables.DIMENSIONS_DATA! as any).sequelize.query(`
  SELECT t1.id, t1.latest_timestamp, t2.data
  FROM (
    SELECT id, MAX(timestamp) as latest_timestamp
    FROM DIMENSIONS_DATA
    WHERE type = :adapterType AND timestamp >=  (EXTRACT(EPOCH FROM NOW() - INTERVAL '7 days'))
    GROUP BY id
  ) as t1
  JOIN DIMENSIONS_DATA as t2
  ON t1.id = t2.id AND t1.latest_timestamp = t2.timestamp AND t2.type = :adapterType
`, {
    replacements: { adapterType: adapterType },
    type: QueryTypes.SELECT
  })

  console.timeEnd(label)
  const response: {
    [key: string]: {
      latest_timestamp: number
      data: any
      id: string
    }
  } = {}
  result.forEach((item: any) => {
    response[item.id] = item
  })

  return response
}

// to get all last two data points of each project for a given adapter type in the last 7 days
export async function getLastTwoRecordsWIP(adapterType: AdapterType) {
  await init()

  const label = `getItemsLastButOneUpdated(${adapterType})`
  console.time(label)
  const result = await (Tables.DIMENSIONS_DATA! as any).sequelize.query(`
  SELECT t1.id, t1.latest_two_timestamps, ARRAY[t2.data, t3.data] as latest_two_data
  FROM (
    SELECT id, 
      ARRAY[(ARRAY_AGG(timestamp ORDER BY timestamp DESC))[1], (ARRAY_AGG(timestamp ORDER BY timestamp DESC))[2]] as latest_two_timestamps
    FROM DIMENSIONS_DATA
    WHERE type = :adapterType AND timestamp >= (EXTRACT(EPOCH FROM NOW() - INTERVAL '7 days'))
    GROUP BY id
  ) as t1
  JOIN DIMENSIONS_DATA as t2
  ON t1.id = t2.id AND t1.latest_two_timestamps[1] = t2.timestamp AND t2.type = :adapterType
  JOIN DIMENSIONS_DATA as t3
  ON t1.id = t3.id AND t1.latest_two_timestamps[2] = t3.timestamp AND t3.type = :adapterType
`, {
    replacements: { adapterType: adapterType },
    type: QueryTypes.SELECT
  });

  console.timeEnd(label)
  console.log(result)
  /* const response: {
    [key: string]: {
      latest_timestamp: number
      data: any
      id: string
    }
  } = {}
  result.forEach((item: any) => {
    response[item.id] = item
  })

  return response */
}

export async function getAllItemsUpdatedAfter({ adapterType, timestamp }: { adapterType: AdapterType, timestamp: number}) {
  await init()
  if (timestamp < 946684800) timestamp = 946684800 // 2000-01-01

  const label = `getAllItemsUpdatedAfter(${adapterType})`
  console.time(label)

  const result: any = await Tables.DIMENSIONS_DATA.findAll({
    where: { type: adapterType, timestamp: { [Op.gte]: timestamp  } },
    attributes: ['data', 'timestamp', 'id', 'timeS'],
    raw: true,
    order: [['timestamp', 'ASC']],
  })

  console.timeEnd(label)
  return result
}