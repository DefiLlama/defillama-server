import { Model, ModelStatic, Op, QueryTypes, Sequelize, Options as SequelizeOptions } from 'sequelize'

import { log } from '@defillama/sdk'
import getEnv, { validateEnv } from '../env'
import { initializeTables, Tables as TABLES } from './tables'

import {
  dailyRawTokensTvl,
  dailyTokensTvl,
  dailyTvl,
  dailyUsdTokensTvl,
  hourlyRawTokensTvl,
  hourlyTokensTvl,
  hourlyTvl,
  hourlyUsdTokensTvl,
} from "../../utils/getLastRecord"
import { deleteFromPGCache, getDailyTvlCacheId, readFromPGCache, writeToPGCache } from '../cache/file-cache'
import { getTimestampString } from '../utils'

const dummyId = 'dummyId'

type TVLCacheRecord = {
  id: string,
  timestamp: number,
  data: any,
  timeS: string,
}

type SaveRecordOptions = {
  overwriteExistingData?: boolean,
}

const tableMapping = {
  [dailyTvl(dummyId)]: TABLES.DAILY_TVL,
  [dailyTokensTvl(dummyId)]: TABLES.DAILY_TOKENS_TVL,
  [dailyUsdTokensTvl(dummyId)]: TABLES.DAILY_USD_TOKENS_TVL,
  [dailyRawTokensTvl(dummyId)]: TABLES.DAILY_RAW_TOKENS_TVL,
  [hourlyTvl(dummyId)]: TABLES.HOURLY_TVL,
  [hourlyTokensTvl(dummyId)]: TABLES.HOURLY_TOKENS_TVL,
  [hourlyUsdTokensTvl(dummyId)]: TABLES.HOURLY_USD_TOKENS_TVL,
  [hourlyRawTokensTvl(dummyId)]: TABLES.HOURLY_RAW_TOKENS_TVL,
}

function getTVLCacheTable(ddbPKFunction: Function): ModelStatic<Model<any, any>> {
  const key = ddbPKFunction(dummyId)
  return tableMapping[key]
}

export enum TVLRecordType {
  TVL = 'tvl',
  TOKEN = 'token',
  USD_TOKEN = 'usdToken',
}

const keyMapDaily: { [key: string]: Function } = {
  [TVLRecordType.TVL]: dailyTvl,
  [TVLRecordType.TOKEN]: dailyTokensTvl,
  [TVLRecordType.USD_TOKEN]: dailyUsdTokensTvl,
}

const keyMapHourly: { [key: string]: Function } = {
  [TVLRecordType.TVL]: hourlyTvl,
  [TVLRecordType.TOKEN]: hourlyTokensTvl,
  [TVLRecordType.USD_TOKEN]: hourlyUsdTokensTvl,
}

// Use daily table if timestamp is older than 2 days, else use hourly table
export function getTVLCacheTableNameForTimestamp(key: TVLRecordType, unixTS: number) {

  const twoDaysAgo = Date.now() / 1000 - 2 * 24 * 3600
  const keyMap = unixTS < twoDaysAgo ? keyMapDaily : keyMapHourly
  const ddbPKFunction = keyMap[key]

  return getTVLCacheTable(ddbPKFunction)
}

function isHourlyDDBPK(ddbPKFunction: Function) {
  const key = ddbPKFunction(dummyId)
  return key.includes('hourly')
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}

async function withPgRetries<T>(fn: () => Promise<T>, retries = 2, baseDelayMs = 2000): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err: any) {
      lastErr = err
      const msg = `${err?.name ?? ''} ${err?.message ?? ''}`
      const retriable =
        msg.includes('SequelizeConnectionAcquireTimeoutError') ||
        msg.includes('SequelizeConnectionError') ||
        msg.includes('TimeoutError') ||
        msg.includes('ETIMEDOUT') ||
        msg.includes('ECONNRESET')
      if (!retriable || attempt === retries) break
      const delay = baseDelayMs * Math.pow(2, attempt) // 2000ms, 4000ms
      log(`PG retry #${attempt + 1} in ${delay}ms -> ${err?.name}`)
      await sleep(delay)
    }
  }
  throw lastErr
}

let sequelize: Sequelize | null = null
let mSequalize: Sequelize

async function initializeTVLCacheDB({
  isApi2Server = false,
} = {}) {
  if (!sequelize) {
    const ENV = getEnv()
    validateEnv()
    const dbOptions: SequelizeOptions = {
      host: ENV.host,
      port: (ENV.port as any),
      username: ENV.user,
      password: ENV.password,
      database: ENV.db_name,
      dialect: 'postgres',
      logging: (msg: string) => {
        if (msg.includes('ERROR')) { // Log only error messages
          console.error(msg);
        }
      },
    }
    if (isApi2Server)
      dbOptions.pool = {
        max: 5,
        min: 0,
        idle: 5000,
        acquire: 300000, // increase this if your queries take a long time to run
        evict: 1000, // how often to run eviction checks
      }
    else
      dbOptions.pool = {
        max: 5,
        min: 0,
        idle: 5000,
        acquire: 30000, // increase this if your queries take a long time to run
        evict: 1000, // how often to run eviction checks
      }

    const metricsDbOptions = {
      host: ENV.metrics_host,
      port: ENV.metrics_port,
      username: ENV.metrics_user,
      password: ENV.metrics_password,
      database: ENV.metrics_db_name,
      dialect: 'postgres',
      logging: (msg: string) => {
        if (msg.includes('ERROR')) { // Log only error messages
          console.error(msg);
        }
      },
    }

    if (ENV.isCoolifyTask) {
      if (ENV.internalHost) {
        dbOptions.host = ENV.internalHost
        delete dbOptions.port
      }
      // metricsDbOptions.host = ENV.metrics_internalHost
      // delete metricsDbOptions.port
    }

    sequelize = new Sequelize(dbOptions as any);
    if (metricsDbOptions.host)
      mSequalize = new Sequelize(metricsDbOptions as any);
    initializeTables(sequelize, mSequalize)
    // await sequelize.sync() // needed only for table creation/update
    // await mSequalize.sync() // needed only for table creation/update
    log('Database connection established.')
  }
}

async function _getAllProtocolItems(ddbPKFunction: Function, protocolId: string, { timestampAfter }: { timestampAfter?: number } = {}) {
  const table = getTVLCacheTable(ddbPKFunction)
  const filterOptions: any = { id: protocolId }
  if (timestampAfter) filterOptions.timestamp = { [Op.gt]: timestampAfter }
  const items = await table.findAll({
    where: filterOptions,
    attributes: ['data', 'timestamp'],
    order: [['timestamp', 'ASC']],
    raw: true,
  })
  items.forEach((i: any) => i.data.SK = i.timestamp)
  return items.map((i: any) => i.data)
}

async function _getAllItemsAtTimeS(ddbPKFunction: Function, timestamp: number) {
  const table = getTVLCacheTable(ddbPKFunction)
  const timeS = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const items = await table.sequelize!.query(
    `SELECT id, "data", "timeS" FROM "${table.getTableName()}" WHERE "timeS" = '${timeS}' ORDER BY id`,
    { type: QueryTypes.SELECT }
  )
  return items
}

async function _getLatestProtocolItem(ddbPKFunction: Function, protocolId: string) {
  const table = getTVLCacheTable(ddbPKFunction)
  const item: any = await withPgRetries(() =>
    table.findOne({
      where: { id: protocolId },
      attributes: ['data', 'timestamp'],
      raw: true,
      order: [['timestamp', 'DESC']],
    })
  )
  if (!item) return null
  item.data.SK = item.timestamp
  return item.data
}

async function _getClosestProtocolItem(ddbPKFunction: Function, protocolId: string, timestampTo: number, { searchWidth, timestampFrom }: { searchWidth?: number, timestampFrom?: number }) {
  const table = getTVLCacheTable(ddbPKFunction)
  let timestampFilter: any = { [Op.lte]: timestampTo }

  if (searchWidth && timestampFrom)
    throw new Error('Cannot use both searchWidth and timestampFrom')

  if (searchWidth) {
    timestampFilter = { [Op.gte]: timestampTo - searchWidth, [Op.lte]: timestampTo + searchWidth }

    const items: any = await withPgRetries(() =>
      table.findAll({
        where: { id: protocolId, timestamp: timestampFilter },
        attributes: ['data', 'timestamp'],
        raw: true,
        order: [['timestamp', 'DESC']],
      })
    )
    if (!items.length) return null

    let closest = items[0];
    for (const item of items.slice(1)) {
      if (Math.abs(item.timestamp - timestampTo) < Math.abs(closest.timestamp - timestampTo)) {
        closest = item;
      }
    }
    closest.data.SK = closest.timestamp
    return closest.data

  } else if (timestampFrom)
    timestampFilter = { [Op.gte]: timestampFrom, [Op.lte]: timestampTo }

  const item: any = await withPgRetries(() =>
    table.findOne({
      where: { id: protocolId, timestamp: timestampFilter },
      attributes: ['data', 'timestamp'],
      raw: true,
      order: [['timestamp', 'DESC']],
    })
  )
  if (!item) return null
  item.data.SK = item.timestamp
  return item.data
}

async function _saveProtocolItem(ddbPKFunction: Function, record: TVLCacheRecord, options: SaveRecordOptions = {}) {
  record.timeS = getTimestampString(record.timestamp, isHourlyDDBPK(ddbPKFunction))
  validateRecord(record)

  const table = getTVLCacheTable(ddbPKFunction)

  return withPgRetries(async () => {
    if (options.overwriteExistingData) {
      await table.upsert(record)
    } else {
      await table.findOrCreate({
        where: { id: record.id, timeS: record.timeS },
        defaults: record,
      })
    }
  }, 2, 2000)
}

async function deleteProtocolItems(ddbPKFunction: Function, where: any) {
  const table = getTVLCacheTable(ddbPKFunction)
  const response = await table.destroy({ where })
  console.log('[Postgres] delete item count', response)
}


async function _getLatestProtocolItems(ddbPKFunction: Function, { filterLast24Hours = false, filterADayAgo = false, filterAWeekAgo = false, filterAMonthAgo = false, ids = [] } = {}) {
  const table = getTVLCacheTable(ddbPKFunction)
  let whereClause = '';

  if (filterLast24Hours) {
    const date24HoursAgo = new Date()
    date24HoursAgo.setDate(date24HoursAgo.getDate() - 1)
    whereClause = ` WHERE timestamp >= '${getUnixTime(date24HoursAgo)}'`;
  }

  if (filterADayAgo || filterAWeekAgo || filterAMonthAgo) {
    let dayCount = 1
    if (filterAWeekAgo) dayCount = 7
    if (filterAMonthAgo) dayCount = 30

    // we give 20 minutes of buffer to make sure we don't miss any data
    const date = new Date()
    date.setDate(date.getDate() - dayCount)
    date.setMinutes(date.getMinutes() + 20);
    const toTime = getUnixTime(date)
    date.setDate(date.getDate() - 1)
    date.setMinutes(date.getMinutes() - 2 * 20);
    const fromTime = getUnixTime(date)

    whereClause = ` WHERE timestamp BETWEEN '${fromTime}' AND '${toTime}'`;
  }

  if (ids.length > 0) {
    const idsList = ids.map(id => `'${id}'`).join(', ');
    whereClause += whereClause ? ` AND id IN (${idsList})` : ` WHERE id IN (${idsList})`;
  }

  const items = await table.sequelize!.query(
    `SELECT DISTINCT ON (id) id, "data" , "timestamp" FROM "${table.getTableName()}" ${whereClause} ORDER BY id, timestamp DESC`,
    { type: QueryTypes.SELECT }
  )

  // log('[Postgres] fetch item count', table.getTableName(), items.length)

  items.forEach((i: any) => i.data.SK = i.timestamp)
  return items

  function getUnixTime(date: Date) {
    return Math.floor(+date / 1e3)
  }
}

const ONE_HOUR = 3600
const ONE_DAY = 24 * ONE_HOUR

type InflowRecord = {
  oldTokens?: { date: number, tvl: { [token: string]: number } },
  currentTokens?: { date: number, tvl: { [token: string]: number } },
  currentUsdTokens?: { date: number, tvl: { [token: string]: number } },
}

async function _getInflowRecords({ startTimestamp, endTimestamp, ids, bufferTimeAfter = ONE_HOUR, bufferTimeBefore = ONE_DAY * 2 }: {
  startTimestamp: number,
  endTimestamp: number,
  ids: string[],
  bufferTimeAfter?: number,
  bufferTimeBefore?: number,
}): Promise<{ [id: string]:  InflowRecord}> {
  if (!ids?.length) return {}

  const currentTokensTable = getTVLCacheTableNameForTimestamp(TVLRecordType.TOKEN, endTimestamp)
  const currentUsdTokensTable = getTVLCacheTableNameForTimestamp(TVLRecordType.USD_TOKEN, endTimestamp)
  const oldTokensTable = getTVLCacheTableNameForTimestamp(TVLRecordType.TOKEN, startTimestamp)

  const idQuery =  ` AND id IN (${ids.map(id => `'${id}'`).join(', ')})`
  const commonSelectQueryStart = `SELECT DISTINCT ON (id) id, "data"->'tvl' as tvl , "timestamp" as date FROM `
  const commonSelectQueryEnd = `ORDER BY id, timestamp DESC`

  const currentTokensQuery = `${commonSelectQueryStart} "${currentTokensTable.getTableName()}"
   WHERE timestamp BETWEEN '${endTimestamp - bufferTimeBefore}' AND '${endTimestamp + bufferTimeAfter}' ${idQuery}
    ${commonSelectQueryEnd}`

  const currentUsdTokensQuery = `${commonSelectQueryStart}  "${currentUsdTokensTable.getTableName()}"
   WHERE timestamp BETWEEN '${endTimestamp - bufferTimeBefore}' AND '${endTimestamp + bufferTimeAfter}' ${idQuery}
    ${commonSelectQueryEnd}`

  const oldTokensQuery = `${commonSelectQueryStart} "${oldTokensTable.getTableName()}"
   WHERE timestamp BETWEEN '${startTimestamp - bufferTimeBefore}' AND '${startTimestamp + bufferTimeAfter}' ${idQuery}
    ${commonSelectQueryEnd}`
  
  const oldUsdTokensQuery = `${commonSelectQueryStart} "${currentUsdTokensTable.getTableName()}"
   WHERE timestamp BETWEEN '${startTimestamp - bufferTimeBefore}' AND '${startTimestamp + bufferTimeAfter}' ${idQuery}
    ${commonSelectQueryEnd}`

  const [oldTokensItems, currentTokensItems, currentUsdTokensItems, oldUsdTokensItems] = await Promise.all([oldTokensQuery, currentTokensQuery, currentUsdTokensQuery, oldUsdTokensQuery].map(query => oldTokensTable.sequelize!.query(query, { type: QueryTypes.SELECT })))

  const response: { [id: string]: InflowRecord } = {}

  oldTokensItems.forEach((addField('oldTokens')))
  oldUsdTokensItems.forEach((addField('oldUsdTokens')))
  currentTokensItems.forEach((addField('currentTokens')))
  currentUsdTokensItems.forEach((addField('currentUsdTokens')))
  
  return response

  function addField(field: string) {
    return (item: any) => {
      if (!response[item.id]) response[item.id] = {};
      (response as any)[item.id][field] = { date: item.date, tvl: item.tvl }
    }
  }
}

// return count of hourly tvl records updated in the last 2 hours
async function getHourlyTvlUpdatedRecordsCount() {
  const table = TABLES.HOURLY_TVL;
  const query = `SELECT COUNT(*) as count FROM "${table.getTableName()}" WHERE timestamp >= ${Math.floor(Date.now() / 1000) - 2 * 60 * 60}`;
  const result = await table.sequelize!.query(query, { type: QueryTypes.SELECT });
  return (result[0] as any).count;
}

// return count of dimensions records updated in the last 2 hours
async function getDimensionsUpdatedRecordsCount() {
  const table = TABLES.DIMENSIONS_DATA;
  const query = `SELECT COUNT(*) as count FROM "${table.getTableName()}" WHERE updatedat >= to_timestamp(${Math.floor(Date.now() / 1000) - 2 * 60 * 60})`;
  const result = await table.sequelize!.query(query, { type: QueryTypes.SELECT });
  return (result[0] as any).count;
}

// return count of tweets pulled in the last 3 days
async function getTweetsPulledCount() {
  const query = `SELECT COUNT(*) as count FROM twitter_tweets WHERE createdat >= to_timestamp(${Math.floor(Date.now() / 1000) - 3 * 24 * 60 * 60})`;
  const result = await TABLES.DIMENSIONS_DATA.sequelize!.query(query, { type: QueryTypes.SELECT });
  return (result[0] as any).count;
}

function validateRecord(record: TVLCacheRecord) {
  if (!record.id || typeof record.id !== 'string') throw new Error('Missing id')
  if (!record.timeS || typeof record.timeS !== 'string') throw new Error('Missing timeS')
  if (!record.timestamp || typeof record.timestamp !== 'number') throw new Error('Missing timestamp')
  if (!record.data || typeof record.data !== 'object') throw new Error('Missing data')
}

async function closeConnection() {
  if (!sequelize) return;
  try {
    const closing = sequelize.close()
    sequelize = null
    await closing
    console.log('Database connection closed.');
  } catch (error) {
    console.error('Error while closing the database connection:', error);
  }
}

function callWrapper(fn: Function) {
  return async (...args: any[]) => {
    try {
      await initializeTVLCacheDB()
      return fn(...args)
    } catch (e) {
      console.error((e as any)?.message)
    }
  }
}


async function _getProtocolItems(ddbPKFunction: Function, protocolId: string, { timestampTo, timestampFrom }: { timestampTo?: number, timestampFrom?: number }) {
  const table = getTVLCacheTable(ddbPKFunction)
  let timestampFilter: any = {}

  if (timestampFrom) timestampFilter[Op.gte] = timestampFrom
  if (timestampTo) timestampFilter[Op.lte] = timestampTo

  const items: any = await table.findAll({
    where: { id: protocolId, timestamp: timestampFilter },
    attributes: ['data', 'timestamp'],
    raw: true,
    order: [['timestamp', 'DESC']],
  })

  items.forEach((i: any) => i.data.SK = i.timestamp)

  return items.map((i: any) => i.data)
}

const getLatestProtocolItem = callWrapper(_getLatestProtocolItem)
const getAllProtocolItems = callWrapper(_getAllProtocolItems)
const getClosestProtocolItem = callWrapper(_getClosestProtocolItem)
const saveProtocolItem = callWrapper(_saveProtocolItem)
const getProtocolItems = callWrapper(_getProtocolItems)
const getLatestProtocolItems = callWrapper(_getLatestProtocolItems)
const getInflowRecords = callWrapper(_getInflowRecords)
const getAllItemsAtTimeS = callWrapper(_getAllItemsAtTimeS)

function getPGConnection() {
  return sequelize
}

export {
  closeConnection, deleteFromPGCache, deleteProtocolItems, getAllProtocolItems,
  getClosestProtocolItem, getDailyTvlCacheId, getDimensionsUpdatedRecordsCount, getHourlyTvlUpdatedRecordsCount, getLatestProtocolItem, getLatestProtocolItems, getPGConnection, getProtocolItems, getTweetsPulledCount, initializeTVLCacheDB, readFromPGCache, saveProtocolItem, sequelize, TABLES, writeToPGCache,
  getInflowRecords, getAllItemsAtTimeS,
}

// Add a process exit hook to close the database connection
process.on('beforeExit', closeConnection);
process.on('exit', closeConnection);

