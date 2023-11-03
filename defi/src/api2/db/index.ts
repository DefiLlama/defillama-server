import { Sequelize, Model, ModelStatic, Op, Options as SequelizeOptions } from 'sequelize'

import getEnv from '../env'
import { initializeTables, Tables as TABLES } from './tables'

import {
  dailyTvl, dailyTokensTvl, dailyUsdTokensTvl, dailyRawTokensTvl, hourlyTvl, hourlyTokensTvl, hourlyUsdTokensTvl, hourlyRawTokensTvl,
} from "../../utils/getLastRecord"
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
        max: 30,
        min: 0,
        idle: 5000,
        acquire: 120000, // increase this if your queries take a long time to run
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
      dbOptions.host = ENV.internalHost
      // metricsDbOptions.host = ENV.metrics_internalHost
      delete dbOptions.port
      // delete metricsDbOptions.port
    }

    sequelize = new Sequelize(dbOptions as any);
    if (metricsDbOptions.host)
      mSequalize = new Sequelize(metricsDbOptions as any);
    initializeTables(sequelize, mSequalize)
    // await sequelize.sync() // needed only for table creation/update
    // await mSequalize.sync() // needed only for table creation/update
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
  console.log('delete item count', response)
}

function validateRecord(record: TVLCacheRecord) {
  if (!record.id || typeof record.id !== 'string') throw new Error('Missing id')
  if (!record.timeS || typeof record.timeS !== 'string') throw new Error('Missing timeS')
  if (!record.timestamp || typeof record.timestamp !== 'number') throw new Error('Missing timestamp')
  if (!record.data || typeof record.data !== 'object') throw new Error('Missing data')
}

async function writeToPGCache(key: string, data: any) {
  const table = TABLES.JSON_CACHE
  if (typeof data !== 'object') data = JSON.stringify(data)
  await table.upsert({ id: key, data, timestamp: Math.floor(Date.now() / 1e3) })
}

async function readFromPGCache(key: string, { withTimestamp = false } = {}) {
  const table = TABLES.JSON_CACHE
  const item: any = await table.findOne({
    where: { id: key },
    attributes: ['data', 'timestamp'],
    raw: true,
  })
  if (!item) return null
  try {
    item.data = JSON.parse(item.data)
  } catch { }
  if (withTimestamp) return item
  return item.data
}

async function deleteFromPGCache(key: string) {
  const table = TABLES.JSON_CACHE
  await table.destroy({ where: { id: key } })
}

function getDailyTvlCacheId(id: string) {
  if (!id) throw new Error('Missing required parameter: id')
  return `tvl-cache-daily/${id}`
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

export {
  TABLES,
  sequelize,
  getLatestProtocolItem,
  getAllProtocolItems,
  getClosestProtocolItem,
  saveProtocolItem,
  initializeTVLCacheDB,
  closeConnection,
  deleteProtocolItems,
  writeToPGCache,
  readFromPGCache,
  deleteFromPGCache,
  getDailyTvlCacheId,
}

// Add a process exit hook to close the database connection
process.on('beforeExit', closeConnection);
process.on('exit', closeConnection);

