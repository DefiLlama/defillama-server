import postgres from "postgres";
import { getTimestampAtStartOfDay } from "../utils/date";

// CREATE TABLE hourlyUsers (start INT, endTime INT, protocolId VARCHAR(200), chain VARCHAR(200), users INT, PRIMARY KEY(start, protocolId, chain));
// CREATE INDEX idx_time ON hourlyUsers (start);
// CREATE TABLE dailyUsers (start INT, endTime INT, protocolId VARCHAR(200), chain VARCHAR(200), users INT, realStart INT, PRIMARY KEY(start, protocolId, chain));
// CREATE INDEX idx_time2 ON dailyUsers (start);

const sql = postgres(process.env.ACCOUNTS_DB!);

export async function storeUsers(start:number, end:number, protocolId:string, chain:string, users:number) {
    const startDayTimestamp = getTimestampAtStartOfDay(start)
    const otherDailyItems = await sql`SELECT start FROM dailyUsers WHERE start = ${startDayTimestamp} AND protocolId = ${protocolId}`
    if(otherDailyItems.length === 0){
        await sql`
  insert into dailyUsers (
    start, endTime, protocolId, chain, users, realStart
  ) values (
    ${startDayTimestamp}, ${end}, ${protocolId}, ${chain}, ${users}, ${start}
  )
`
    }
    await sql`
    insert into hourlyUsers (
      start, endTime, protocolId, chain, users
    ) values (
      ${start}, ${end}, ${protocolId}, ${chain}, ${users}
    )
  `
}