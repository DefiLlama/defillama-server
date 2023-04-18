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

export async function getProtocolTxs(protocolId:string) {
  return sql`SELECT * FROM dailyTxs WHERE protocolId = ${protocolId} AND chain = 'all'`
}

export async function getProtocolGas(protocolId:string) {
  return sql`SELECT * FROM dailyGas WHERE protocolId = ${protocolId} AND chain = 'all'`
}

export async function getLatestUsersData(minEnd:number, chain: string) {
  return sql`SELECT * FROM hourlyUsers WHERE endTime > ${minEnd} AND chain = ${chain}`
}