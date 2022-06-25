import mysql from 'mysql2/promise';

// Error tables
// CREATE TABLE errors (time INT, protocol VARCHAR(200), error TEXT, PRIMARY KEY(time, protocol), INDEX `idx_time` (`time` ASC) VISIBLE);
// CREATE TABLE errors2 (time INT, protocol VARCHAR(200), error TEXT, storedKey VARCHAR(200), chain VARCHAR(200), PRIMARY KEY(time, protocol, storedKey), INDEX `idx_time` (`time` ASC) VISIBLE);
// CREATE TABLE completed (time INT, protocol VARCHAR(200), elapsedTime INT, storedKey VARCHAR(200), chain VARCHAR(200), PRIMARY KEY(time, protocol, storedKey), INDEX `idx_time` (`time` ASC) VISIBLE);
// CREATE TABLE timeouts (time INT, protocol VARCHAR(200), PRIMARY KEY(time, protocol), INDEX `idx_time` (`time` ASC) VISIBLE);

const connection = mysql.createPool({
  host: 'error-logs.cluster-cz3l9ki794cf.eu-central-1.rds.amazonaws.com',
  port: 3306,
  user: 'admin',
  database: 'content',
  password: process.env.INFLUXDB_TOKEN,
  waitForConnections: true,
  connectionLimit: 1,
});

export function executeAndIgnoreErrors(sql: string, values: any){
    return connection.execute(sql, values)
    .catch(e => console.log("mysql error", e));
}