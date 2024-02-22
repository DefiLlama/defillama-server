
import { Tables } from "../../api2/db/tables"
import dynamodb from "../../utils/shared/dynamodb"
import { initializeTVLCacheDB } from "../../api2/db"
import { AdapterRecord2 } from "./AdapterRecord2"
import { AdapterType } from "@defillama/dimension-adapters/adapters/types"
import configs from "../data/configs"
import { QueryTypes } from "sequelize"

let isInitialized: any

async function init() {
  if (!isInitialized) isInitialized = initializeTVLCacheDB()
  return isInitialized
}

export async function storeAdapterRecord(record: AdapterRecord2) {

  await init()

  const pgItem = record.getPGItem()
  const hourlyDDbItem = record.getHourlyDDBItem()
  const ddbItem = record.getDDBItem()

  await Promise.all([
    Tables.DIMENSIONS_DATA.upsert(pgItem),
    dynamodb.putDimensionsData(ddbItem),
    dynamodb.putDimensionsData(hourlyDDbItem),
  ])
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
    WHERE type = :adapterType
    GROUP BY id
  ) as t1
  JOIN DIMENSIONS_DATA as t2
  ON t1.id = t2.id AND t1.latest_timestamp = t2.timestamp AND t2.type = :adapterType
`, {
  replacements: { adapterType: adapterType },
  type: QueryTypes.SELECT
})

  console.timeEnd(label)
  const response: { [key: string]: {
    latest_timestamp: number
    data: any
    id: string
  } } = {}
  result.forEach((item: any) => {
    response[item.id] = item
  })

  return response
}

// to get all the second to last updated items for a given adapter type in the last 7 days
export async function getItemsLastButOneUpdated(adapterType: AdapterType) {
  await init()

  const label = `getItemsLastButOneUpdated(${adapterType})`
  console.time(label)

  const result = await (Tables.DIMENSIONS_DATA! as any).sequelize.query(`
  SELECT t1.id, t1.latest_timestamp, t2.data
  FROM (
    SELECT id, MAX(timestamp) as latest_timestamp
    FROM DIMENSIONS_DATA
    WHERE type = :adapterType AND timestamp >= (NOW() - INTERVAL '7 days')
    GROUP BY id
  ) as t1
  JOIN DIMENSIONS_DATA as t2
  ON t1.id = t2.id AND t1.latest_timestamp = t2.timestamp AND t2.type = :adapterType AND t2.timestamp >= (NOW() - INTERVAL '7 days')
`, {
  replacements: { adapterType: adapterType },
  type: QueryTypes.SELECT
})

  console.timeEnd(label)
  const response: { [key: string]: {
    latest_timestamp: number
    data: any
    id: string
  } } = {}
  result.forEach((item: any) => {
    response[item.id] = item
  })

  return response
}

