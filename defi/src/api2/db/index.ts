import { Sequelize, Model, ModelStatic, } from 'sequelize'

import ENV from '../env'
import { initializeTables } from './tables'

const dbOptions = {
  host: ENV.host,
  port: ENV.port,
  username: ENV.user,
  password: ENV.password,
  database: ENV.db_name,
  dialect: 'postgres',
  logging: (msg: string) => {
    // Log only error messages
    if (msg.includes('ERROR')) {
      console.error(msg);
    }
  },
}

const sequelize = new Sequelize(dbOptions as any);
const TABLES = initializeTables(sequelize);

let isDBSynced: any = null

async function syncTvlPostgresDB() {
  if (!isDBSynced)
    isDBSynced = sequelize.sync()
  return isDBSynced
}

async function getAllProtocolItems(table: ModelStatic<Model<any, any>>, protocolId: string) {
  const items = await table.findAll({
    where: { id: protocolId },
    attributes: ['data', 'timestamp'],
    order: [['timestamp', 'ASC']],
    raw: true,
  })
  items.forEach((i: any) => i.data.SK = i.timestamp)
  return items.map((i: any) => i.data)
}

async function getLatestProtocolItem(table: ModelStatic<Model<any, any>>, protocolId: string) {
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

export {
  TABLES,
  sequelize,
  getLatestProtocolItem,
  getAllProtocolItems,
  syncTvlPostgresDB,
}