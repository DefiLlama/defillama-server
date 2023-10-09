const ENV = process.env

if (!process.env.tableName) process.env.tableName = 'prod-table'
if (!process.env.AWS_REGION) process.env.AWS_REGION = 'eu-central-1'

const requiredEnvVars = ['TVL_CACHE_DB_NAME', 'TVL_CACHE_DB_HOST', 'TVL_CACHE_DB_PORT', 'TVL_CACHE_DB_USERNAME', 'TVL_CACHE_DB_PASSWORD',]

if (requiredEnvVars.some((envVar) => !ENV[envVar]))
  throw new Error(`Missing required environment variables: ${requiredEnvVars.join(', ')}`)

export default {
  tableName: ENV.tableName,
  AWS_REGION: ENV.AWS_REGION,
  db_name: ENV.TVL_CACHE_DB_NAME,
  host: ENV.TVL_CACHE_DB_HOST,
  port: ENV.TVL_CACHE_DB_PORT,
  user: ENV.TVL_CACHE_DB_USERNAME,
  password: ENV.TVL_CACHE_DB_PASSWORD,
}