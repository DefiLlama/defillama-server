const ENV = process.env

process.env.tableName = 'prod-table'
process.env.AWS_REGION = 'eu-central-1'

export default {
  tableName: ENV.tableName,
  AWS_REGION: ENV.AWS_REGION,
  db_name: ENV.TVL_CACHE_DB_NAME,
  host: ENV.TVL_CACHE_DB_HOST,
  port: ENV.TVL_CACHE_DB_PORT,
  user: ENV.TVL_CACHE_DB_USERNAME,
  password: ENV.TVL_CACHE_DB_PASSWORD,
  R2_ENDPOINT: ENV.R2_ENDPOINT,
  R2_ACCESS_KEY_ID: ENV.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: ENV.R2_SECRET_ACCESS_KEY,
}