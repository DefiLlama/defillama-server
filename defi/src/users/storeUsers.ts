
import { getTimestampAtStartOfDay } from "../utils/date";
import { getAccountsDBConnection as getConnection } from "../getDBConnection";

export async function storeUsers(start: number, end: number, protocolId: string, chain: string, users: number) {
  const sql = getConnection()
  const startDayTimestamp = getTimestampAtStartOfDay(start)
  const otherDailyItems = await sql`SELECT start FROM dailyUsers WHERE start = ${startDayTimestamp} AND protocolId = ${protocolId} AND chain = ${chain}`
  if (otherDailyItems.length === 0) {
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

export async function storeNewUsers(start: number, end: number, protocolId: string, chain: string, users: number) {
  const sql = getConnection()
  const startDayTimestamp = getTimestampAtStartOfDay(start)
  const otherDailyItems = await sql`SELECT start FROM dailyNewUsers WHERE start = ${startDayTimestamp} AND protocolId = ${protocolId} AND chain = ${chain}`
  if (otherDailyItems.length === 0) {
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

export async function storeTxs(start: number, end: number, protocolId: string, chain: string, txs: number) {
  const sql = getConnection()
  const startDayTimestamp = getTimestampAtStartOfDay(start)
  const otherDailyItems = await sql`SELECT start FROM dailyTxs WHERE start = ${startDayTimestamp} AND protocolId = ${protocolId} AND chain = ${chain}`
  if (otherDailyItems.length === 0) {
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

export async function storeGas(start: number, end: number, protocolId: string, chain: string, gas: number | null, gasUsd: number) {
  const sql = getConnection()
  const startDayTimestamp = getTimestampAtStartOfDay(start)
  const otherDailyItems = await sql`SELECT start FROM dailyGas WHERE start = ${startDayTimestamp} AND protocolId = ${protocolId} AND chain = ${chain}`
  if (otherDailyItems.length === 0) {
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

export async function getProtocolUsers(protocolId: string) {
  const sql = getConnection()
  return sql`SELECT * FROM dailyUsers WHERE protocolId = ${protocolId} AND chain = 'all'`
}
export async function getProtocolNewUsers(protocolId: string) {
  const sql = getConnection()
  return sql`SELECT * FROM dailyNewUsers WHERE protocolId = ${protocolId} AND chain = 'all'`
}

export async function getProtocolTxs(protocolId: string) {
  const sql = getConnection()
  return sql`SELECT start, sum(txs) FROM dailyTxs WHERE protocolId = ${protocolId} group by start`
}

export async function getProtocolGas(protocolId: string) {
  const sql = getConnection()
  return sql`SELECT start, sum(gasUsd) FROM dailyGas WHERE protocolId = ${protocolId} group by start`
}

export function getLatestUsersData(type: "users" | "newUsers" | "txs" | "gasUsd", minEnd: number) {
  return {
    users: () => getConnection()`SELECT * FROM hourlyUsers WHERE endTime > ${minEnd} AND chain = 'all'`,
    newUsers: () => getConnection()`SELECT * FROM hourlyNewUsers WHERE endTime > ${minEnd} AND chain = 'all'`,
    txs: () => getConnection()`SELECT endTime, protocolId, sum(txs) FROM hourlyTxs WHERE endTime > ${minEnd} group by endTime, protocolId`,
    gasUsd: () => getConnection()`SELECT endTime, protocolId, sum(gasUsd) FROM hourlyGas WHERE endTime > ${minEnd} group by endTime, protocolId`,
  }[type]()
}

export function getLatestProtocolUsersData(type: "users" | "newusers" | "txs" | "gasUsd", minEnd: number, protocolId: string) {
  return {
    users: () => getConnection()`SELECT * FROM hourlyUsers WHERE endTime > ${minEnd} AND chain = 'all' AND protocolId = ${protocolId}`,
    newusers: () => getConnection()`SELECT * FROM hourlyNewUsers WHERE endTime > ${minEnd} AND chain = 'all' AND protocolId = ${protocolId}`,
    txs: () => getConnection()`SELECT endTime, sum(txs) FROM hourlyTxs WHERE endTime > ${minEnd} AND protocolId = ${protocolId} group by endTime`,
    gasUsd: () => getConnection()`SELECT endTime, sum(gasUsd) FROM hourlyGas WHERE endTime > ${minEnd} AND protocolId = ${protocolId} group by endTime`,
  }[type]()
}

export function getTotalProtocolUsersData() {
  const sql = getConnection()
  return sql`
WITH USAGE AS (
    SELECT
        users.protocolId,
        txs.txs AS total_txs,
        users.users AS total_users
    FROM
        (
            SELECT
                protocolId,
                SUM(users) AS users
            FROM
                dailyNewUsers
            GROUP BY
                protocolId
        ) AS users
        LEFT JOIN (
            SELECT
                protocolId,
                SUM(txs) AS txs
            FROM
                dailyTxs
            GROUP BY
                protocolId
        ) AS txs ON users.protocolId = txs.protocolId
)
SELECT
    *,
    total_txs / (NULLIF(total_users, 0) * 1.0) AS txs_over_users
FROM
    USAGE
WHERE protocolId NOT LIKE 'chain%'
  `
}