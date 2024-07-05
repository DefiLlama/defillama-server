import { Sequelize, Model, ModelStatic, Op, Options as SequelizeOptions, QueryTypes } from 'sequelize'

import getEnv, { validateEnv } from '../env'
import { initializeTables, Tables as TABLES } from './tables'
import { log } from '@defillama/sdk'

import {
  dailyTvl, dailyTokensTvl, dailyUsdTokensTvl, dailyRawTokensTvl, hourlyTvl, hourlyTokensTvl, hourlyUsdTokensTvl, hourlyRawTokensTvl,
} from "../../utils/getLastRecord"
import { getTimestampString } from '../utils'
import { readFromPGCache, writeToPGCache, getDailyTvlCacheId, deleteFromPGCache } from '../cache/file-cache'

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

function isHourlyDDBPK(ddbPKFunction: Function) {
  const key = ddbPKFunction(dummyId)
  return key.includes('hourly')
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
        acquire: 30000, // increase this if your queries take a long time to run
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

async function _getLatestProtocolItem(ddbPKFunction: Function, protocolId: string) {
  const table = getTVLCacheTable(ddbPKFunction)
  const item: any = await table.findOne({
    where: { id: protocolId },
    attributes: ['data', 'timestamp'],
    raw: true,
    order: [['timestamp', 'DESC']],
  })
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

    const items: any = await table.findAll({
      where: { id: protocolId, timestamp: timestampFilter },
      attributes: ['data', 'timestamp'],
      raw: true,
      order: [['timestamp', 'DESC']],
    })

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

  const item: any = await table.findOne({
    where: { id: protocolId, timestamp: timestampFilter },
    attributes: ['data', 'timestamp'],
    raw: true,
    order: [['timestamp', 'DESC']],
  })
  if (!item) return null
  item.data.SK = item.timestamp
  return item.data
}

async function _saveProtocolItem(ddbPKFunction: Function, record: TVLCacheRecord, options: SaveRecordOptions = {}) {
  record.timeS = getTimestampString(record.timestamp, isHourlyDDBPK(ddbPKFunction))
  validateRecord(record)

  const table = getTVLCacheTable(ddbPKFunction)

  if (options.overwriteExistingData) {
    await table.upsert(record)
  } else {
    await table.findOrCreate({
      where: { id: record.id, timeS: record.timeS },
      defaults: record,
    })
  }
}

async function deleteProtocolItems(ddbPKFunction: Function, where: any) {
  const table = getTVLCacheTable(ddbPKFunction)
  const response = await table.destroy({ where })
  console.log('[Postgres] delete item count', response)
}


async function getLatestProtocolItems(ddbPKFunction: Function, { filterLast24Hours = false, filterADayAgo = false, filterAWeekAgo = false, filterAMonthAgo = false, } = {}) {
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

  const items = await table.sequelize!.query(
    `SELECT DISTINCT ON (id) id, "data" , "timestamp" FROM "${table.getTableName()}" ${whereClause} ORDER BY id, timestamp DESC`,
    { type: QueryTypes.SELECT }
  )

  log('[Postgres] fetch item count', table.getTableName(), items.length)

  items.forEach((i: any) => i.data.SK = i.timestamp)
  return items

  function getUnixTime(date: Date) {
    return Math.floor(+date / 1e3)
  }
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

const getLatestProtocolItem = callWrapper(_getLatestProtocolItem)
const getAllProtocolItems = callWrapper(_getAllProtocolItems)
const getClosestProtocolItem = callWrapper(_getClosestProtocolItem)
const saveProtocolItem = callWrapper(_saveProtocolItem)

function getPGConnection() {
  return sequelize
}

export {
  TABLES,
  sequelize,
  getLatestProtocolItem,
  getAllProtocolItems,
  getClosestProtocolItem,
  saveProtocolItem,
  getPGConnection,
  initializeTVLCacheDB,
  closeConnection,
  deleteProtocolItems,
  readFromPGCache,
  writeToPGCache,
  deleteFromPGCache,
  getDailyTvlCacheId,
  getLatestProtocolItems,
}

// Add a process exit hook to close the database connection
process.on('beforeExit', closeConnection);
process.on('exit', closeConnection);

