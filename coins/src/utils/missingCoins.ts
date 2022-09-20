import mysql from 'mysql2/promise';
import { getCurrentUnixTimestamp } from './date';

// Tables
// CREATE TABLE missing (time INT, coin VARCHAR(500), timestampRequested INT, rawCoin VARCHAR(500), chain VARCHAR(100), PRIMARY KEY(time, coin, timestampRequested), INDEX `idx_time` (`time` ASC) VISIBLE);

const connection = mysql.createPool({
  host: 'coin-errors-instance-1.cz3l9ki794cf.eu-central-1.rds.amazonaws.com',
  port: 3306,
  user: 'admin',
  database: 'content',
  password: process.env.MISSING_COINS_DB_PWD,
  waitForConnections: true,
  connectionLimit: 1,
});

function executeAndIgnoreErrors(sql: string, values: any){
    return connection.execute(sql, values)
    .catch((e:any) => console.log("mysql error", e));
}

export function storeMissingCoins(requestedCoins: string[], response: {
    [coin:string]:any
}, timestampRequested:number){ // timestampRequested = 0 -> current data
   return Promise.all(requestedCoins.map(async coin=>{
    if(response[coin] === undefined){
        const lowercaseCoin = coin.toLowerCase()
        return executeAndIgnoreErrors('INSERT INTO `missing` VALUES (?, ?, ?, ?)', 
            [getCurrentUnixTimestamp(), lowercaseCoin, coin, timestampRequested, lowercaseCoin.split(":")[0]])
    }
   }))
}