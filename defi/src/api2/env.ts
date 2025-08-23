require('dotenv').config();


const requiredEnvVars = ['TVL_CACHE_DB_NAME', 'TVL_CACHE_DB_HOST', 'TVL_CACHE_DB_PORT', 'TVL_CACHE_DB_USERNAME', 'TVL_CACHE_DB_PASSWORD',]

export function validateEnv() {
  const ENV = process.env
  // const isCoolifyTask = ENV.IS_COOLIFY_TASK === 'true'

  // if (isCoolifyTask) requiredEnvVars.push('TVL_CACHE_DB_HOST_INTERNAL')

  if (requiredEnvVars.some((envVar) => !ENV[envVar]) && !ENV.TVL_CACHE_DB_CONFIG)
    throw new Error(`Missing required environment variables: ${requiredEnvVars.join(', ')}`)
}

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); //  absolute reference for wind mates 


export default function getTvlCacheEnv() {
  const ENV = process.env

  if (!process.env.tableName) process.env.tableName = 'prod-table'
  if (!process.env.AWS_REGION) process.env.AWS_REGION = 'eu-central-1'
  if (!process.env.API2_CACHE_DIR) process.env.API2_CACHE_DIR = __dirname + '/.api2-cache'

  const isCoolifyTask = ENV.IS_COOLIFY_TASK === 'true'

  if (ENV.DEV_METRICS_DB_CONFIG) {
    const metricsConfig = JSON.parse(ENV.DEV_METRICS_DB_CONFIG.replace(/(\\)+"/g, '"')) // replace escaped quotes
    ENV.DEV_METRICS_DB_NAME = metricsConfig.db_name;
    ENV.DEV_METRICS_DB_HOST = metricsConfig.host;
    ENV.DEV_METRICS_DB_PORT = metricsConfig.port;
    ENV.DEV_METRICS_DB_USERNAME = metricsConfig.user;
    ENV.DEV_METRICS_DB_PASSWORD = metricsConfig.password;
    ENV.DEV_METRICS_DB_HOST_INTERNAL = metricsConfig.internalHost;
  }

  if (ENV.TVL_CACHE_DB_CONFIG) {
    const tvlCacheConfig = JSON.parse(ENV.TVL_CACHE_DB_CONFIG.replace(/(\\)+"/g, '"')) // replace escaped quotes
    ENV.TVL_CACHE_DB_NAME = tvlCacheConfig.db_name;
    ENV.TVL_CACHE_DB_HOST = tvlCacheConfig.host;
    ENV.TVL_CACHE_DB_PORT = tvlCacheConfig.port;
    ENV.TVL_CACHE_DB_USERNAME = tvlCacheConfig.user;
    ENV.TVL_CACHE_DB_PASSWORD = tvlCacheConfig.password;
    ENV.TVL_CACHE_DB_HOST_INTERNAL = tvlCacheConfig.internalHost;
  }

  return {
    tableName: ENV.tableName,
    AWS_REGION: ENV.AWS_REGION,
    db_name: ENV.TVL_CACHE_DB_NAME,
    host: ENV.TVL_CACHE_DB_HOST,
    port: ENV.TVL_CACHE_DB_PORT,
    user: ENV.TVL_CACHE_DB_USERNAME,
    password: ENV.TVL_CACHE_DB_PASSWORD,
    isCoolifyTask,
    internalHost: ENV.TVL_CACHE_DB_HOST_INTERNAL,
    metrics_db_name: ENV.DEV_METRICS_DB_NAME,
    metrics_host: ENV.DEV_METRICS_DB_HOST,
    metrics_port: ENV.DEV_METRICS_DB_PORT,
    metrics_user: ENV.DEV_METRICS_DB_USERNAME,
    metrics_password: ENV.DEV_METRICS_DB_PASSWORD,
    metrics_internalHost: ENV.DEV_METRICS_DB_HOST_INTERNAL,
    api2CacheDir: ENV.API2_CACHE_DIR,
  }
}
