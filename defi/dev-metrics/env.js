const ENV = process.env

module.exports = {
  db_name: ENV.DEV_METRICS_DB_NAME,
  host: ENV.DEV_METRICS_DB_HOST,
  port: ENV.DEV_METRICS_DB_PORT,
  user: ENV.DEV_METRICS_DB_USERNAME,
  password: ENV.DEV_METRICS_DB_PASSWORD,
}