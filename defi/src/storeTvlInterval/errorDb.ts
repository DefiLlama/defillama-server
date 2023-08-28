import mysql from 'mysql2/promise';
import plimit from 'p-limit'

// Error tables
// CREATE TABLE errors (time INT, protocol VARCHAR(200), error TEXT, PRIMARY KEY(time, protocol), INDEX `idx_time` (`time` ASC) VISIBLE);
// CREATE TABLE errors2 (time INT, protocol VARCHAR(200), error TEXT, storedKey VARCHAR(200), chain VARCHAR(200), PRIMARY KEY(time, protocol, storedKey), INDEX `idx_time` (`time` ASC) VISIBLE);
// CREATE TABLE completed (time INT, protocol VARCHAR(200), elapsedTime INT, storedKey VARCHAR(200), chain VARCHAR(200), PRIMARY KEY(time, protocol, storedKey), INDEX `idx_time` (`time` ASC) VISIBLE);
// CREATE TABLE timeouts (time INT, protocol VARCHAR(200), PRIMARY KEY(time, protocol), INDEX `idx_time` (`time` ASC) VISIBLE);
// CREATE TABLE staleCoins (time INT, address VARCHAR(500), lastUpdate INT, chain VARCHAR(200), symbol VARCHAR(200), PRIMARY KEY(time, address, chain), INDEX `idx_time` (`time` ASC) VISIBLE);

let connection: mysql.Pool | undefined;

const rateLimit = plimit(5)


const isLambda = !!process.env.LAMBDA_TASK_ROOT;
function getConnection() {
  if (!connection)
    connection = mysql.createPool({
      host: process.env.ERROR_DB,
      port: 9007,
      user: 'clh3m0sco0zwbbso49r00gqyo',
      database: 'clh3m0sco0zwdbso44e9u269x',
      password: process.env.INFLUXDB_TOKEN,
      waitForConnections: true,
      connectionLimit: isLambda? 1 : 21,
    })
  return connection
}

export function execute(sql: string, values: any){
  return rateLimit(() => getConnection().execute(sql, values))
}

export function executeAndIgnoreErrors(sql: string, values: any){
  rateLimit(() => getConnection().execute(sql, values))
    .catch(e => console.log("mysql error", e.message));
}