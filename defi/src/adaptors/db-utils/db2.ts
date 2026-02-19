import * as sdk from "@defillama/sdk"
const { sliceIntoChunks, } = sdk.util
import { Op, } from "sequelize"
import { initializeTVLCacheDB } from "../../api2/db"
import { Tables } from "../../api2/db/tables"
import dynamodb from "../../utils/shared/dynamodb"
import { AdapterType, IJSON } from "../data/types"
import { AdapterRecord2 } from "./AdapterRecord2"

let isInitialized: any

export async function init() {
  if (!isInitialized) isInitialized = initializeTVLCacheDB()
  return isInitialized
}

export async function storeAdapterRecord(record: AdapterRecord2, retriesLeft = 3) {
  try {
    await init()

    const pgItem = record.getPGItem()
    // const hourlyDDbItem = record.getHourlyDDBItem()  // we are storing this as event record
    const ddbItem = record.getDDBItem()
    const eventItem = { ...record.getDDBItem(), source: 'dimension-adapter' }

    await Promise.all([
      Tables.DIMENSIONS_DATA.upsert(pgItem),
      dynamodb.putDimensionsData(ddbItem),
      // dynamodb.putDimensionsData(hourlyDDbItem),
      dynamodb.putEventData(eventItem),
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
    updateOnDuplicate: ['timestamp', 'data', 'type', 'bl', 'blc', 'tb', 'tbl', 'tblc']
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

export async function getAllItemsUpdatedAfter({ adapterType, timestamp, transform = a => a }: { adapterType: AdapterType, timestamp: number, transform?: (a: any) => any }) {
  await init()
  if (timestamp < 946684800) timestamp = 946684800 // 2000-01-01

  const label = `getAllItemsUpdatedAfter(${adapterType})`
  // console.time(label)

  let result: any = []
  let offset = 0
  const limit = 30000

  while (true) {
    const batch: any = await Tables.DIMENSIONS_DATA.findAll({
      where: { type: adapterType, updatedat: { [Op.gte]: timestamp * 1000 } },
      attributes: ['data', 'timestamp', 'id', 'timeS', 'bl'],
      raw: true,
      order: [['timestamp', 'ASC']],
      offset,
      limit,
    })

    result = result.concat(batch.map(transform))
    // sdk.log(`getAllItemsUpdatedAfter(${adapterType}) found ${batch.length} total fetched: ${result.length} items updated after ${new Date(timestamp * 1000)}`)
    if (batch.length < limit) break
    offset += limit
  }

  // sdk.log(`getAllItemsUpdatedAfter(${adapterType}) found ${result.length} items updated after ${new Date(timestamp * 1000)}`)
  // console.timeEnd(label)
  return result
}


export async function getAllItemsAfter({ adapterType, timestamp = 0, transform = a => a }: { adapterType: AdapterType, timestamp?: number, transform?: (a: any) => any }) {
  await init()
  if (timestamp < 946684800) timestamp = 946684800 // 2000-01-01

  const filterCondition: any = { timestamp: { [Op.gte]: timestamp } }
  if (adapterType) filterCondition.type = adapterType

  let result: any = []
  let offset = 0
  const limit = 30000
  const label = `getAllItemsAfter(${adapterType}, ${timestamp})`
  console.time(label)

  while (true) {
    const batch: any = await Tables.DIMENSIONS_DATA.findAll({
      where: filterCondition,
      attributes: ['data', 'timestamp', 'id', 'timeS', 'bl'],
      raw: true,
      order: [['timestamp', 'ASC']],
      offset,
      limit,
    })

    result = result.concat(batch.map(transform))
    sdk.log(`getAllItemsAfter(${adapterType}, ${timestamp}) found ${batch.length} total fetched: ${result.length} items after ${new Date(timestamp * 1000)}`)
    if (batch.length < limit) break
    offset += limit
  }

  console.timeEnd(label)

  return result
}

export async function getAllDimensionsRecordsOnDate({ adapterType, date }: { adapterType: AdapterType, date: string }) {
  await init()


  const result: any = await Tables.DIMENSIONS_DATA.findAll({
    where: { type: adapterType, timeS: date },
    attributes: ['timestamp', 'id', 'timeS', 'updatedat'],
    raw: true,
  })

  return result
}

export async function getAllDimensionsRecordsTimeS({ adapterType, id, timestamp }: { adapterType: AdapterType, id?: string, timestamp?: number }) {
  await init()

  const where: any = { type: adapterType, }
  if (id) where['id'] = id
  if (timestamp) where['timestamp'] = { [Op.gte]: timestamp }

  const result: any = await Tables.DIMENSIONS_DATA.findAll({
    where,
    attributes: ['timestamp', 'id', 'timeS'],
    raw: true,
  })

  return result
}

export async function getDimensionsRecordsInRange({ adapterType, id, fromTimestamp, toTimestamp }: { adapterType: AdapterType, id: string, fromTimestamp: number, toTimestamp: number }) {
  await init()

  const result: any = await Tables.DIMENSIONS_DATA.findAll({
    where: {
      type: adapterType,
      id,
      timestamp: { [Op.gte]: fromTimestamp, [Op.lte]: toTimestamp },
    },
    attributes: ['id', 'timestamp', 'timeS', 'type', 'data'],
    raw: true,
  })

  return result
}

export function getHourlyTimeS(timestamp: number) {
  const d = new Date(timestamp * 1000)
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const hh = String(d.getUTCHours()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}-${hh}`
}

export function getUnixTsFromHourlyTimeS(timeS: string) {
  const [yyyy, mm, dd, hh] = timeS.split('-').map(Number)
  const d = new Date(Date.UTC(yyyy, mm - 1, dd, hh))
  return Math.floor(d.getTime() / 1000)
}

export async function getHourlySlicesForProtocol({ adapterType, id, fromTimestamp, toTimestamp, transform = a => a }: { adapterType: AdapterType, id: string, fromTimestamp: number, toTimestamp: number, transform?: (a: any) => any}) {
  await init()

  if (fromTimestamp < 946684800) fromTimestamp = 946684800 // 2000-01-01

  const rows: any[] = await Tables.DIMENSIONS_HOURLY_DATA.findAll({
    where: {
      type: adapterType,
      id,
      timestamp: { [Op.gte]: fromTimestamp, [Op.lte]: toTimestamp },
    },
    attributes: ['timestamp', 'id', 'timeS', 'data', 'bl', 'blc', 'tb', 'tbl', 'tblc'],
    raw: true,
    order: [['timestamp', 'ASC']],
  })

  return rows.map(transform)
}

export async function getHourlySlicesBulk({ adapterType, fromTimestamp, toTimestamp, transform = a => a }: { adapterType: AdapterType, fromTimestamp: number, toTimestamp: number, transform?: (a: any) => any }) {
  await init()

  if (fromTimestamp < 946684800) fromTimestamp = 946684800 // 2000-01-01

  const rows: any[] = await Tables.DIMENSIONS_HOURLY_DATA.findAll({
    where: {
      type: adapterType,
      timestamp: { [Op.gte]: fromTimestamp, [Op.lte]: toTimestamp },
    },
    attributes: ['timestamp', 'id', 'timeS', 'data', 'bl', 'blc', 'tb', 'tbl', 'tblc'],
    raw: true,
    order: [['timestamp', 'ASC']],
  })

  return rows.map(transform)
}

export async function upsertHourlySlicesForProtocol({ adapterType, id, slices }: { adapterType: AdapterType, id: string, slices: { timestamp: number, data: any, bl?: any, blc?: any, timeS?: string, tb?: any, tbl?: any, tblc?: any, }[] }) {
  if (!slices?.length) return
  await init()

  const pgItems = slices.map(slice => ({
    id,
    type: adapterType,
    timestamp: slice.timestamp,
    data: slice.data,
    bl: slice.bl ?? null,
    blc: slice.blc ?? null,
    tb: slice.tb ?? null,
    tbl: slice.tbl ?? null,
    tblc: slice.tblc ?? null,
    timeS: slice.timeS ?? getHourlyTimeS(slice.timestamp),
    updatedat: Date.now(),
  }))

  await Tables.DIMENSIONS_HOURLY_DATA.bulkCreate(pgItems, {
    updateOnDuplicate: ['timestamp', 'data', 'bl', 'blc', 'tb', 'tbl', 'tblc', 'updatedat'],
  })

  const tokenSlices = slices.filter(s => s.tb)
  if (!tokenSlices.length) return

  for (const slice of tokenSlices) {
    const ts = slice.timestamp
    const timeS = slice.timeS ?? getHourlyTimeS(ts)

    const eventItem: any = {
      PK: `dimHourlyTokenBreakdown#${adapterType}#${id}`,
      SK: String(ts),
      type: adapterType,
      id,
      timestamp: ts,
      timeS,
      source: 'dimension-adapter',
      subType: 'token-breakdown-hourly',
      data: slice.tb, // both usdTokenBalances + rawTokenBalances
    }

    try {
      await dynamodb.putEventData(eventItem)
    } catch (e) {
      console.error('Error writing hourly token breakdown event to ddb', id, ts, e)
    }
  }
}