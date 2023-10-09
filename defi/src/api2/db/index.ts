import { Sequelize, Model, ModelStatic, } from 'sequelize'

import getEnv from '../env'
import { initializeTables, Tables as TABLES } from './tables'

import {
  dailyTvl, dailyTokensTvl, dailyUsdTokensTvl, dailyRawTokensTvl, hourlyTvl, hourlyTokensTvl, hourlyUsdTokensTvl, hourlyRawTokensTvl,
} from "../../utils/getLastRecord"
import { getTimestampString } from '../utils'

const dummyId = 'dummyId'

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

async function initializeTVLCacheDB() {
  if (!sequelize) {
    const ENV = getEnv()
    const dbOptions = {
      host: ENV.host,
      port: ENV.port,
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

    sequelize = new Sequelize(dbOptions as any);
    initializeTables(sequelize)
    await sequelize.sync()
  }
}

async function getAllProtocolItems(ddbPKFunction: Function, protocolId: string) {
  const table = getTVLCacheTable(ddbPKFunction)
  const items = await table.findAll({
    where: { id: protocolId },
    attributes: ['data', 'timestamp'],
    order: [['timestamp', 'ASC']],
    raw: true,
  })
  items.forEach((i: any) => i.data.SK = i.timestamp)
  return items.map((i: any) => i.data)
}

async function getLatestProtocolItem(ddbPKFunction: Function, protocolId: string) {
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

async function getClosestProtocolItem(ddbPKFunction: Function, protocolId: string, timestamp: number) {
  const table = getTVLCacheTable(ddbPKFunction)
  const item: any = await table.findOne({
    where: { id: protocolId, timestamp: { $lte: timestamp } },
    attributes: ['data', 'timestamp'],
    raw: true,
    order: [['timestamp', 'DESC']],
  })
  if (!item) return null
  item.data.SK = item.timestamp
  return item.data
}

async function saveProtocolItem(ddbPKFunction: Function, protocolId: string, timestamp: number, data: any) {
  const table = getTVLCacheTable(ddbPKFunction)
  await table.upsert({
    id: protocolId,
    timestamp,
    data,
    timeS: getTimestampString(timestamp, isHourlyDDBPK(ddbPKFunction)),
  })
}

export {
  TABLES,
  sequelize,
  getLatestProtocolItem,
  getAllProtocolItems,
  getClosestProtocolItem,
  saveProtocolItem,
  initializeTVLCacheDB,
}