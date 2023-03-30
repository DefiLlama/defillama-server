import mysql from 'mysql2/promise';

// Error tables
// CREATE TABLE errors (time INT, protocol VARCHAR(200), error TEXT, PRIMARY KEY(time, protocol), INDEX `idx_time` (`time` ASC) VISIBLE);
// CREATE TABLE errors2 (time INT, protocol VARCHAR(200), error TEXT, storedKey VARCHAR(200), chain VARCHAR(200), PRIMARY KEY(time, protocol, storedKey), INDEX `idx_time` (`time` ASC) VISIBLE);
// CREATE TABLE completed (time INT, protocol VARCHAR(200), elapsedTime INT, storedKey VARCHAR(200), chain VARCHAR(200), PRIMARY KEY(time, protocol, storedKey), INDEX `idx_time` (`time` ASC) VISIBLE);
// CREATE TABLE timeouts (time INT, protocol VARCHAR(200), PRIMARY KEY(time, protocol), INDEX `idx_time` (`time` ASC) VISIBLE);
// CREATE TABLE staleCoins (time INT, address VARCHAR(500), lastUpdate INT, chain VARCHAR(200), symbol VARCHAR(200), PRIMARY KEY(time, address, chain), INDEX `idx_time` (`time` ASC) VISIBLE);

const connection = mysql.createPool({
  host: '65.21.124.238',
  port: 9001,
  user: 'clcaq1fik030jb3p821iw5dqt',
  database: 'clcaq1fik030lb3p8gnjbb1s4',
  password: process.env.INFLUXDB_TOKEN,
  waitForConnections: true,
  connectionLimit: 1,
});

export function execute(sql: string, values: any){
  return connection.execute(sql, values)
}

export function executeAndIgnoreErrors(sql: string, values: any){
    // return connection.execute(sql, values)
    // .catch(e => console.log("mysql error", e));
    sql
    values
  return
}