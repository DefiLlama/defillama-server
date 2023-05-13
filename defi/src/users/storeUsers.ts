import postgres from "postgres";
import { getTimestampAtStartOfDay } from "../utils/date";

const sql = postgres(process.env.ACCOUNTS_DB!);

export async function storeUsers(start:number, end:number, protocolId:string, chain:string, users:number) {
    const startDayTimestamp = getTimestampAtStartOfDay(start)
    const otherDailyItems = await sql`SELECT start FROM dailyUsers WHERE start = ${startDayTimestamp} AND protocolId = ${protocolId} AND chain = ${chain}`
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

export async function storeNewUsers(start:number, end:number, protocolId:string, chain:string, users:number) {
  const startDayTimestamp = getTimestampAtStartOfDay(start)
  const otherDailyItems = await sql`SELECT start FROM dailyNewUsers WHERE start = ${startDayTimestamp} AND protocolId = ${protocolId} AND chain = ${chain}`
  if(otherDailyItems.length === 0){
      await sql`
insert into dailyNewUsers (
  start, endTime, protocolId, chain, users, realStart
) values (
  ${startDayTimestamp}, ${end}, ${protocolId}, ${chain}, ${users}, ${start}
)
`
  }
  await sql`
  insert into hourlyNewUsers (
    start, endTime, protocolId, chain, users
  ) values (
    ${start}, ${end}, ${protocolId}, ${chain}, ${users}
  )
`
}

export async function storeTxs(start:number, end:number, protocolId:string, chain:string, txs:number) {
  const startDayTimestamp = getTimestampAtStartOfDay(start)
  const otherDailyItems = await sql`SELECT start FROM dailyTxs WHERE start = ${startDayTimestamp} AND protocolId = ${protocolId} AND chain = ${chain}`
  if(otherDailyItems.length === 0){
      await sql`
insert into dailyTxs (
  start, endTime, protocolId, chain, txs, realStart
) values (
  ${startDayTimestamp}, ${end}, ${protocolId}, ${chain}, ${txs}, ${start}
)
`
  }
  await sql`
  insert into hourlyTxs (
    start, endTime, protocolId, chain, txs
  ) values (
    ${start}, ${end}, ${protocolId}, ${chain}, ${txs}
  )
`
}

export async function storeGas(start:number, end:number, protocolId:string, chain:string, gas:number|null, gasUsd:number) {
  const startDayTimestamp = getTimestampAtStartOfDay(start)
  const otherDailyItems = await sql`SELECT start FROM dailyGas WHERE start = ${startDayTimestamp} AND protocolId = ${protocolId} AND chain = ${chain}`
  if(otherDailyItems.length === 0){
      await sql`
insert into dailyGas (
  start, endTime, protocolId, chain, gas, gasUsd, realStart
) values (
  ${startDayTimestamp}, ${end}, ${protocolId}, ${chain}, ${gas}, ${gasUsd}, ${start}
)
`
  }
  await sql`
  insert into hourlyGas (
    start, endTime, protocolId, chain, gas, gasUsd
  ) values (
    ${start}, ${end}, ${protocolId}, ${chain}, ${gas}, ${gasUsd}
  )
`
}

export async function getProtocolUsers(protocolId:string) {
  return sql`SELECT * FROM dailyUsers WHERE protocolId = ${protocolId} AND chain = 'all'`
}
export async function getProtocolNewUsers(protocolId:string) {
  return sql`SELECT * FROM dailyNewUsers WHERE protocolId = ${protocolId} AND chain = 'all'`
}

export async function getProtocolTxs(protocolId:string) {
  return sql`SELECT start, sum(txs) FROM dailyTxs WHERE protocolId = ${protocolId} group by start`
}

export async function getProtocolGas(protocolId:string) {
  return sql`SELECT start, sum(gasUsd) FROM dailyGas WHERE protocolId = ${protocolId} group by start`
}

export function getLatestUsersData(type: "users"|"newUsers"|"txs"|"gasUsd", minEnd:number) {
  return {
    users: ()=>sql`SELECT * FROM hourlyUsers WHERE endTime > ${minEnd} AND chain = 'all'`,
    newUsers: ()=>sql`SELECT * FROM hourlyNewUsers WHERE endTime > ${minEnd} AND chain = 'all'`,
    txs: ()=>sql`SELECT endTime, protocolId, sum(txs) FROM hourlyTxs WHERE endTime > ${minEnd} group by endTime, protocolId`,
    gasUsd: ()=>sql`SELECT endTime, protocolId, sum(gasUsd) FROM hourlyGas WHERE endTime > ${minEnd} group by endTime, protocolId`,
  }[type]()
}

export function getLatestProtocolUsersData(type: "users"|"newusers"|"txs"|"gasUsd", minEnd:number, protocolId:string) {
  return {
    users: ()=>sql`SELECT * FROM hourlyUsers WHERE endTime > ${minEnd} AND chain = 'all' AND protocolId = ${protocolId}`,
    newusers: ()=>sql`SELECT * FROM hourlyNewUsers WHERE endTime > ${minEnd} AND chain = 'all' AND protocolId = ${protocolId}`,
    txs: ()=>sql`SELECT endTime, sum(txs) FROM hourlyTxs WHERE endTime > ${minEnd} AND protocolId = ${protocolId} group by endTime`,
    gasUsd: ()=>sql`SELECT endTime, sum(gasUsd) FROM hourlyGas WHERE endTime > ${minEnd} AND protocolId = ${protocolId} group by endTime`,
  }[type]()
}