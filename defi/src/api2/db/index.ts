import { Sequelize, Model, ModelStatic, } from 'sequelize'

import getEnv from '../env'
import { initializeTables, Tables as TABLES } from './tables'

let sequelize: Sequelize | null = null

async function initializeDB() {
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
  initializeDB,
}