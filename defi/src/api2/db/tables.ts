import { Sequelize, Model, DataTypes } from 'sequelize'

const defaultDataColumns = {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  timestamp: {
    type: DataTypes.INTEGER, // Assuming 'unixtimestamp' is an integer type
  },
  data: {
    type: DataTypes.JSON,
  },
  timeS: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  is_simulated: DataTypes.BOOLEAN,
}


class DAILY_TVL extends Model { }
class DAILY_TOKENS_TVL extends Model { }
class DAILY_USD_TOKENS_TVL extends Model { }
class DAILY_RAW_TOKENS_TVL extends Model { }
class HOURLY_TVL extends Model { }
class HOURLY_TOKENS_TVL extends Model { }
class HOURLY_USD_TOKENS_TVL extends Model { }
class HOURLY_RAW_TOKENS_TVL extends Model { }

export const Tables = {
  DAILY_TVL,
  DAILY_TOKENS_TVL,
  DAILY_USD_TOKENS_TVL,
  DAILY_RAW_TOKENS_TVL,
  HOURLY_TVL,
  HOURLY_TOKENS_TVL,
  HOURLY_USD_TOKENS_TVL,
  HOURLY_RAW_TOKENS_TVL,
}

export function initializeTables(sequelize: Sequelize) {
  const getTableOptions = (tableName: string) => ({
    sequelize,
    timestamps: true,
    createdAt: 'createdat',
    updatedAt: 'updatedat',
    tableName,
    indexes: [
      {
        name: tableName + '_id_index', // Name of the index for the 'id' field
        fields: ['id'],
      },
      {
        name: tableName + '_timestamp_index', // Name of the index for the 'timestamp' field
        fields: ['timestamp'],
      },
    ]
  })
  DAILY_TVL.init(defaultDataColumns, getTableOptions('dailyTvl'))
  DAILY_TOKENS_TVL.init(defaultDataColumns, getTableOptions('dailyTokensTvl'))
  DAILY_USD_TOKENS_TVL.init(defaultDataColumns, getTableOptions('dailyUsdTokensTvl'))
  DAILY_RAW_TOKENS_TVL.init(defaultDataColumns, getTableOptions('dailyRawTokensTvl'))
  HOURLY_TVL.init(defaultDataColumns, getTableOptions('hourlyTvl'))
  HOURLY_TOKENS_TVL.init(defaultDataColumns, getTableOptions('hourlyTokensTvl'))
  HOURLY_USD_TOKENS_TVL.init(defaultDataColumns, getTableOptions('hourlyUsdTokensTvl'))
  HOURLY_RAW_TOKENS_TVL.init(defaultDataColumns, getTableOptions('hourlyRawTokensTvl'))

  return Tables
}
