import { Sequelize, Model, DataTypes } from 'sequelize'

import ENV  from '../env'
import { initializeTables }  from './tables'

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

export {
  TABLES,
  sequelize,
}