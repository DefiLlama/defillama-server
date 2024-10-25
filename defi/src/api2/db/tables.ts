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

const defaultTvlMetricsDataColumns = {
  time: {
    type: DataTypes.INTEGER,
    primaryKey: true,
  },
  protocol: {
    type: DataTypes.STRING(200),
    primaryKey: true,
  },
}


class DAILY_TVL extends Model { }
class DAILY_TOKENS_TVL extends Model { }
class DAILY_USD_TOKENS_TVL extends Model { }
class DAILY_RAW_TOKENS_TVL extends Model { }
class HOURLY_TVL extends Model { }
class HOURLY_TOKENS_TVL extends Model { }
class HOURLY_USD_TOKENS_TVL extends Model { }
class HOURLY_RAW_TOKENS_TVL extends Model { }
// class JSON_CACHE extends Model { }
class DIMENSIONS_DATA extends Model { }


class TvlMetricsErrors extends Model { }
class TvlMetricsErrors2 extends Model { }
class TvlMetricsCompleted extends Model { }
class TvlMetricsTimeouts extends Model { }
class TvlMetricsStaleCoins extends Model { }

export const Tables = {
  DAILY_TVL,
  DAILY_TOKENS_TVL,
  DAILY_USD_TOKENS_TVL,
  DAILY_RAW_TOKENS_TVL,
  HOURLY_TVL,
  HOURLY_TOKENS_TVL,
  HOURLY_USD_TOKENS_TVL,
  HOURLY_RAW_TOKENS_TVL,
  // JSON_CACHE,
  DIMENSIONS_DATA,
  TvlMetricsErrors,
  TvlMetricsErrors2,
  TvlMetricsCompleted,
  TvlMetricsTimeouts,
  TvlMetricsStaleCoins,
}

export function initializeTables(sequelize: Sequelize, mSequalize?: Sequelize) {
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
  
  DIMENSIONS_DATA.init({
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
    type: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
  }, {
    sequelize,
    timestamps: true,
    createdAt: 'createdat',
    updatedAt: 'updatedat',
    tableName: 'dimensions_data',
    indexes: [
      {
        name: 'dimensions_data_id_index', // Name of the index for the 'id' field
        fields: ['id'],
      },
      { name: 'dimensions_data_type_index', fields: ['type'], },
      { name: 'dimensions_data_timestamp_index', fields: ['timestamp'], },
      { name: 'dimensions_data_updatedat_index', fields: ['updatedat'], },
      
    ]
  })

  /* JSON_CACHE.init({
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
  }, {
    sequelize,
    timestamps: true,
    createdAt: 'createdat',
    updatedAt: 'updatedat',
    tableName: 'json_cache',
    indexes: [
      {
        name: 'json_cache_id_index', // Name of the index for the 'id' field
        fields: ['id'],
      },
    ]
  }) */

  if (!mSequalize) {
    console.log('Metrics DB config is missing, skipping metrics tables initialization')
    return Tables
  }

  const getMetricsTableOptions = (tableName: string) => ({
    sequelize: mSequalize,
    timestamps: true,
    createdAt: 'createdat',
    updatedAt: 'updatedat',
    tableName,
    indexes: [
      {
        name: tableName + '_idx_time',
        fields: ['time'],
      },
      {
        name: tableName + '_idx_protocol',
        fields: ['protocol'],
      },
    ]
  })

  TvlMetricsErrors.init({
    ...defaultTvlMetricsDataColumns,
    error: {
      type: DataTypes.TEXT,
    },
  }, getMetricsTableOptions('tvl_metrics_errors'))
  TvlMetricsErrors2.init({
    ...defaultTvlMetricsDataColumns,
    error: {
      type: DataTypes.TEXT,
    },
    storedKey: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    chain: {
      type: DataTypes.STRING,
    },
  }, getMetricsTableOptions('tvl_metrics_errors2'))
  TvlMetricsCompleted.init({
    ...defaultTvlMetricsDataColumns,
    elapsedTime: {
      type: DataTypes.INTEGER,
    },
    storedKey: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    chain: {
      type: DataTypes.STRING,
    },
  }, getMetricsTableOptions('tvl_metrics_completed'))
  TvlMetricsTimeouts.init(defaultTvlMetricsDataColumns, getMetricsTableOptions('tvl_metrics_timeouts'))
  TvlMetricsStaleCoins.init({
    time: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    address: {
      type: DataTypes.STRING(500),
      primaryKey: true,
    },
    lastUpdate: {
      type: DataTypes.INTEGER,
    },
    chain: {
      type: DataTypes.STRING(200),
      primaryKey: true,
    },
    symbol: {
      type: DataTypes.STRING(200),
    },
  }, {
    ...getMetricsTableOptions('tvl_metrics_stale_coins'),
    indexes: [
      {
        name: 'tvl_metrics_stale_coins_id_index',
        fields: ['time'],
      }]
  })

  return Tables
}
