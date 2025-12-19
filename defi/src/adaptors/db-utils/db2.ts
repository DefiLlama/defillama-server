import * as sdk from "@defillama/sdk"
import { sliceIntoChunks } from "@defillama/sdk/build/util"
import { Op, } from "sequelize"
import { Tables } from "../../api2/db/tables"
import dynamodb from "../../utils/shared/dynamodb"
import { initializeTVLCacheDB } from "../../api2/db"
import { AdapterRecord2 } from "./AdapterRecord2"
import { AdapterType } from "../data/types"
import { IJSON } from "../data/types"
import * as fs from "fs/promises"
import * as path from "path"

let isInitialized: any

const isLocalStoreEnabled = () => process.env.DIM_LOCAL_STORE === 'true'
const getLocalStoreDir = () => process.env.DIM_LOCAL_STORE_DIR || "./dim-local-store"

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

async function writeJsonAtomic(filePath: string, data: any) {
  const dir = path.dirname(filePath)
  await ensureDir(dir)
  const tmpPath = `${filePath}.tmp`
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2))
  await fs.rename(tmpPath, filePath)
}

async function readJsonIfExists(filePath: string) {
  try {
    const raw = await fs.readFile(filePath, "utf-8")
    return JSON.parse(raw)
  } catch (e: any) {
    if (e?.code === 'ENOENT') return undefined
    throw e
  }
}

async function listJsonFilesRecursively(root: string): Promise<string[]> {
  const out: string[] = []
  let entries: any[] = []
  try {
    entries = await fs.readdir(root, { withFileTypes: true })
  } catch (e: any) {
    if (e?.code === 'ENOENT') return out
    throw e
  }

  for (const ent of entries) {
    const p = path.join(root, ent.name)
    if (ent.isDirectory()) {
      out.push(...await listJsonFilesRecursively(p))
    } else if (ent.isFile() && ent.name.endsWith(".json")) {
      out.push(p)
    }
  }
  return out
}

function getDailyLocalPath(adapterType: AdapterType, id: string, timeS: string) {
  return path.join(getLocalStoreDir(), "daily", String(adapterType), String(id), `${timeS}.json`)
}

function getHourlyLocalPath(adapterType: AdapterType, id: string, timeS: string) {
  return path.join(getLocalStoreDir(), "hourly", String(adapterType), String(id), `${timeS}.json`)
}

export async function init() {
  if (isLocalStoreEnabled()) return true
  if (!isInitialized) isInitialized = initializeTVLCacheDB()
  return isInitialized
}

export async function storeAdapterRecord(record: AdapterRecord2, retriesLeft = 3) {
  try {
    if (isLocalStoreEnabled()) {
      const pgItem: any = record.getPGItem()
      const filePath = getDailyLocalPath(pgItem.type, pgItem.id, pgItem.timeS)
      await writeJsonAtomic(filePath, pgItem)
      return
    }

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

  if (isLocalStoreEnabled()) {
    for (const r of records) await storeAdapterRecord(r)
    return
  }

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
    updateOnDuplicate: ['timestamp', 'data', 'type', 'bl']
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

  if (isLocalStoreEnabled()) {
    const root = path.join(getLocalStoreDir(), "daily", String(adapterType))
    const files = await listJsonFilesRecursively(root)
    const rows: any[] = []
    for (const f of files) {
      const row = await readJsonIfExists(f)
      if (!row) continue
      if (typeof row.timestamp === 'number' && row.timestamp >= timestamp) rows.push(transform(row))
    }
    rows.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    return rows
  }

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

  if (isLocalStoreEnabled()) {
    const root = path.join(getLocalStoreDir(), "daily", String(adapterType))
    const files = await listJsonFilesRecursively(root)
    const rows: any[] = []
    for (const f of files) {
      const row = await readJsonIfExists(f)
      if (!row) continue
      if (typeof row.timestamp === 'number' && row.timestamp >= timestamp) rows.push(transform(row))
    }
    rows.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    return rows
  }

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

  if (isLocalStoreEnabled()) {
    const root = path.join(getLocalStoreDir(), "daily", String(adapterType))
    const ids: string[] = []
    try {
      const ent = await fs.readdir(root, { withFileTypes: true })
      ent.forEach(e => { if (e.isDirectory()) ids.push(e.name) })
    } catch (e: any) {
      if (e?.code === 'ENOENT') return []
      throw e
    }

    const out: any[] = []
    for (const id of ids) {
      const fp = getDailyLocalPath(adapterType, id, date)
      const row = await readJsonIfExists(fp)
      if (!row) continue
      out.push({ timestamp: row.timestamp, id: row.id, timeS: row.timeS, updatedat: row.updatedat })
    }
    return out
  }

  const result: any = await Tables.DIMENSIONS_DATA.findAll({
    where: { type: adapterType, timeS: date },
    attributes: ['timestamp', 'id', 'timeS', 'updatedat'],
    raw: true,
  })

  return result
}

export async function getAllDimensionsRecordsTimeS({ adapterType, id, timestamp }: { adapterType: AdapterType, id?: string, timestamp?: number }) {
  await init()

  if (isLocalStoreEnabled()) {
    const out: any[] = []
    const root = path.join(getLocalStoreDir(), "daily", String(adapterType))
    const ids = id ? [id] : (() => {
      try { return require("fs").readdirSync(root).filter((x: string) => require("fs").statSync(path.join(root, x)).isDirectory()) } catch { return [] }
    })()

    for (const pid of ids) {
      const folder = path.join(root, String(pid))
      const files = await listJsonFilesRecursively(folder)
      for (const f of files) {
        const row = await readJsonIfExists(f)
        if (!row) continue
        if (timestamp && typeof row.timestamp === 'number' && row.timestamp < timestamp) continue
        out.push({ timestamp: row.timestamp, id: row.id, timeS: row.timeS })
      }
    }

    return out
  }

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

export function getHourlyTimeS(timestamp: number) {
  const d = new Date(timestamp * 1000)
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const hh = String(d.getUTCHours()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}-${hh}`
}

export async function getHourlySlicesForProtocol({ adapterType, id, fromTimestamp, toTimestamp, transform = a => a }: { adapterType: AdapterType, id: string, fromTimestamp: number, toTimestamp: number, transform?: (a: any) => any}) {
  await init()

  if (fromTimestamp < 946684800) fromTimestamp = 946684800 // 2000-01-01

  if (isLocalStoreEnabled()) {
    const rows: any[] = []
    const start = fromTimestamp - (fromTimestamp % 3600)
    const end = toTimestamp - (toTimestamp % 3600)
    for (let ts = start; ts <= end; ts += 3600) {
      const timeS = getHourlyTimeS(ts)
      const fp = getHourlyLocalPath(adapterType, id, timeS)
      const row = await readJsonIfExists(fp)
      if (!row) continue
      rows.push(row)
    }

    rows.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))

    return rows.map(transform)
  }

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

export async function upsertHourlySlicesForProtocol({ adapterType, id, slices }: { adapterType: AdapterType, id: string, slices: { timestamp: number, data: any, bl?: any, blc?: any, timeS?: string, tb?: any, tbl?: any, tblc?: any, }[] }) {
  if (!slices?.length) return
  await init()

  if (isLocalStoreEnabled()) {
    for (const slice of slices) {
      const ts = slice.timestamp
      const timeS = slice.timeS ?? getHourlyTimeS(ts)
      const filePath = getHourlyLocalPath(adapterType, id, timeS)

      const row = {
        id,
        type: adapterType,
        timestamp: ts,
        timeS,
        data: slice.data,
        bl: slice.bl ?? null,
        blc: slice.blc ?? null,
        tb: slice.tb ?? null,
        tbl: slice.tbl ?? null,
        tblc: slice.tblc ?? null,
      }

      await writeJsonAtomic(filePath, row)
    }
    return
  }

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
  }))

  await Tables.DIMENSIONS_HOURLY_DATA.bulkCreate(pgItems, {
    updateOnDuplicate: ['timestamp', 'data', 'bl', 'blc', 'tb', 'tbl', 'tblc'],
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