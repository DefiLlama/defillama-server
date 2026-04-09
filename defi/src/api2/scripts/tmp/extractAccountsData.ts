require("dotenv").config();
import { getAccountsDBConnection } from "../../../utils/shared/getDBConnection";
import { initializeTVLCacheDB, TABLES } from '../../db/index'
import { getTimestampString } from '../../utils'
import { AdapterType, AdaptorRecordType } from "../../../adaptors/data/types"

// --- Types ---

type AccountsRow = {
  start: number
  endtime: number
  protocolid: string
  chain: string
  users?: number
  txs?: number
  gas?: number
  gasusd?: number
  realstart: number
}

type DimensionRecord = {
  id: string
  type: string
  timeS: string
  timestamp: number
  data: {
    aggregated: Record<string, { value: number, chains: Record<string, number> }>
  }
  bl: null
  blc: null
  tb: null
  tbl: null
  tblc: null
}

// --- Config ---

const DRY_RUN = process.argv.includes('--dry-run')
const SPECIFIC_ID = process.argv.find(a => a.startsWith('--id='))?.split('=')[1]

// --- Helpers ---

function buildChainsMap(rows: AccountsRow[], valueKey: 'users' | 'txs' | 'gas' | 'gasusd'): Record<string, number> {
  const chains: Record<string, number> = {}
  for (const row of rows) {
    if (row.chain === 'all') continue
    const val = row[valueKey]
    if (val != null && !isNaN(val)) {
      chains[row.chain] = val
    }
  }
  return chains
}

function getAllValue(rows: AccountsRow[], valueKey: 'users' | 'txs' | 'gas' | 'gasusd'): number | null {
  const allRow = rows.find(r => r.chain === 'all')
  if (!allRow) return null
  const val = allRow[valueKey]
  return (val != null && !isNaN(val)) ? val : null
}

function buildDimensionRecord(id: string, timestamp: number, type: AdapterType, aggregated: Record<string, { value: number, chains: Record<string, number> }>): DimensionRecord {
  return {
    id,
    type,
    timeS: getTimestampString(timestamp),
    timestamp,
    data: { aggregated },
    bl: null,
    blc: null,
    tb: null,
    tbl: null,
    tblc: null,
  }
}

function validateRecord(record: DimensionRecord): string | null {
  if (!record.id || typeof record.id !== 'string') return 'missing or invalid id'
  if (!record.timeS || typeof record.timeS !== 'string') return 'missing or invalid timeS'
  if (typeof record.timestamp !== 'number' || record.timestamp <= 0) return 'invalid timestamp'
  if (!record.data?.aggregated || !Object.keys(record.data.aggregated).length) return 'empty aggregated data'

  for (const [key, entry] of Object.entries(record.data.aggregated)) {
    if (typeof entry.value !== 'number' || isNaN(entry.value)) return `invalid value for ${key}`
    if (typeof entry.chains !== 'object') return `invalid chains for ${key}`
    for (const [chain, chainVal] of Object.entries(entry.chains)) {
      if (typeof chainVal !== 'number' || isNaN(chainVal)) return `invalid chain value for ${key}.${chain}`
    }
  }
  return null
}

// --- Main Migration ---

async function main() {
  const sql = getAccountsDBConnection()
  await initializeTVLCacheDB()

  // Get distinct protocol IDs
  let protocolIds: string[]
  if (SPECIFIC_ID) {
    protocolIds = [SPECIFIC_ID]
  } else {
    const rows = await sql`
      SELECT DISTINCT protocolId FROM dailyUsers
      UNION SELECT DISTINCT protocolId FROM dailyNewUsers
      UNION SELECT DISTINCT protocolId FROM dailyTxs
      UNION SELECT DISTINCT protocolId FROM dailyGas
      ORDER BY protocolId
    `
    protocolIds = rows.map((r: any) => r.protocolid)
  }

  console.log(`Found ${protocolIds.length} protocol(s) to migrate`)

  let totalInserted = 0
  let totalSkipped = 0
  let totalErrors = 0

  for (const protocolId of protocolIds) {
    console.log(`\n--- Processing protocol: ${protocolId} ---`)
    try {
      const result = await migrateProtocol(sql, protocolId)
      totalInserted += result.inserted
      totalSkipped += result.skipped
      totalErrors += result.errors
    } catch (e: any) {
      console.error(`Failed to migrate protocol ${protocolId}:`, e.message)
      totalErrors++
    }
  }

  console.log(`\n=== Migration complete ===`)
  console.log(`Inserted: ${totalInserted}, Skipped: ${totalSkipped}, Errors: ${totalErrors}`)
  if (DRY_RUN) console.log('(DRY RUN - no records were actually inserted)')

  await TABLES.DIMENSIONS_DATA.sequelize?.close()
  await sql.end()
  process.exit(0)
}

async function migrateProtocol(sql: ReturnType<typeof getAccountsDBConnection>, protocolId: string) {
  let inserted = 0
  let skipped = 0
  let errors = 0

  // 1. Migrate dailyNewUsers -> new-users type
  const newUsersResult = await migrateNewUsers(sql, protocolId)
  inserted += newUsersResult.inserted
  skipped += newUsersResult.skipped
  errors += newUsersResult.errors

  // 2. Migrate dailyUsers + dailyTxs + dailyGas -> active-users type
  const activeUsersResult = await migrateActiveUsers(sql, protocolId)
  inserted += activeUsersResult.inserted
  skipped += activeUsersResult.skipped
  errors += activeUsersResult.errors

  console.log(`  Protocol ${protocolId}: inserted=${inserted}, skipped=${skipped}, errors=${errors}`)
  return { inserted, skipped, errors }
}

async function migrateNewUsers(sql: ReturnType<typeof getAccountsDBConnection>, protocolId: string) {
  let inserted = 0, skipped = 0, errors = 0

  const rows: AccountsRow[] = await sql`
    SELECT start, endtime, protocolid, chain, users, realstart
    FROM dailyNewUsers
    WHERE protocolId = ${protocolId}
    ORDER BY start
  `

  // Group by start timestamp
  const byTimestamp = new Map<number, AccountsRow[]>()
  for (const row of rows) {
    const ts = row.start
    if (!byTimestamp.has(ts)) byTimestamp.set(ts, [])
    byTimestamp.get(ts)!.push(row)
  }

  const batch: DimensionRecord[] = []

  for (const [timestamp, tsRows] of byTimestamp) {
    const allRow = tsRows.find(r => r.chain === 'all')
    const value = allRow?.users
    if (value == null || isNaN(value)) {
      skipped++
      continue
    }

    const chains = buildChainsMap(tsRows, 'users')

    const aggregated: Record<string, { value: number, chains: Record<string, number> }> = {
      [AdaptorRecordType.dailyNewUsers]: { value, chains }
    }

    const record = buildDimensionRecord(protocolId, timestamp, AdapterType.NEW_USERS, aggregated)
    const validationError = validateRecord(record)
    if (validationError) {
      console.warn(`  [new-users] Skipping ${protocolId} @ ${record.timeS}: ${validationError}`)
      skipped++
      continue
    }

    batch.push(record)
  }

  if (batch.length && !DRY_RUN) {
    try {
      await TABLES.DIMENSIONS_DATA.bulkCreate(batch, { updateOnDuplicate: ['timestamp', 'data', 'bl', 'blc', 'tb', 'tbl', 'tblc'] })
      inserted = batch.length
    } catch (e: any) {
      console.error(`  [new-users] Bulk insert error for ${protocolId}:`, e.message)
      errors = batch.length
    }
  } else if (DRY_RUN) {
    console.log(`DRY RUN - would insert ${batch.length} new-users records for ${protocolId}`)
    inserted = batch.length
  }

  console.log(`  [new-users] ${protocolId}: inserted=${inserted}, skipped=${skipped}, errors=${errors} (${byTimestamp.size} timestamps)`)
  return { inserted, skipped, errors }
}

async function migrateActiveUsers(sql: ReturnType<typeof getAccountsDBConnection>, protocolId: string) {
  let inserted = 0, skipped = 0, errors = 0

  // Fetch all three tables for this protocol
  const [usersRows, txsRows, gasRows] = await Promise.all([
    sql`SELECT start, endtime, protocolid, chain, users, realstart FROM dailyUsers WHERE protocolId = ${protocolId} ORDER BY start`,
    sql`SELECT start, endtime, protocolid, chain, txs, realstart FROM dailyTxs WHERE protocolId = ${protocolId} ORDER BY start`,
    sql`SELECT start, endtime, protocolid, chain, gas, gasusd, realstart FROM dailyGas WHERE protocolId = ${protocolId} ORDER BY start`,
  ]) as any as [AccountsRow[], AccountsRow[], AccountsRow[]]

  // Group each by start timestamp
  const usersByTs = groupByTimestamp(usersRows)
  const txsByTs = groupByTimestamp(txsRows)
  const gasByTs = groupByTimestamp(gasRows)

  // Collect all unique timestamps
  const allTimestamps = new Set<number>([...usersByTs.keys(), ...txsByTs.keys(), ...gasByTs.keys()])

  const batch: DimensionRecord[] = []

  for (const timestamp of [...allTimestamps].sort((a, b) => a - b)) {
    const uRows = usersByTs.get(timestamp) ?? []
    const tRows = txsByTs.get(timestamp) ?? []
    const gRows = gasByTs.get(timestamp) ?? []

    const aggregated: Record<string, { value: number, chains: Record<string, number> }> = {}

    // dailyActiveUsers
    const usersValue = getAllValue(uRows, 'users')
    if (usersValue != null) {
      aggregated[AdaptorRecordType.dailyActiveUsers] = {
        value: usersValue,
        chains: buildChainsMap(uRows, 'users'),
      }
    }

    // dailyTransactionsCount
    const txsValue = getAllValue(tRows, 'txs')
    if (txsValue != null) {
      aggregated[AdaptorRecordType.dailyTransactionsCount] = {
        value: txsValue,
        chains: buildChainsMap(tRows, 'txs'),
      }
    }

    // dailyGasUsed (use gasUsd if available, otherwise gas)
    const gasUsdValue = getAllValue(gRows, 'gasusd')
    const gasValue = getAllValue(gRows, 'gas')
    if (gasUsdValue != null) {
      aggregated[AdaptorRecordType.dailyGasUsed] = {
        value: gasUsdValue,
        chains: buildChainsMap(gRows, 'gasusd'),
      }
    } else if (gasValue != null) {
      aggregated[AdaptorRecordType.dailyGasUsed] = {
        value: gasValue,
        chains: buildChainsMap(gRows, 'gas'),
      }
    }

    if (!Object.keys(aggregated).length) {
      skipped++
      continue
    }

    const record = buildDimensionRecord(protocolId, timestamp, AdapterType.ACTIVE_USERS, aggregated)
    const validationError = validateRecord(record)
    if (validationError) {
      console.warn(`  [active-users] Skipping ${protocolId} @ ${record.timeS}: ${validationError}`)
      skipped++
      continue
    }

    batch.push(record)
  }

  if (batch.length && !DRY_RUN) {
    try {
      await TABLES.DIMENSIONS_DATA.bulkCreate(batch, { updateOnDuplicate: ['timestamp', 'data', 'bl', 'blc', 'tb', 'tbl', 'tblc'] })
      inserted = batch.length
    } catch (e: any) {
      console.error(`  [active-users] Bulk insert error for ${protocolId}:`, e.message)
      errors = batch.length
    }
  } else if (DRY_RUN) {
    console.log(`DRY RUN - would insert ${batch.length} active-users records for ${protocolId}`)
    inserted = batch.length
  }

  console.log(`  [active-users] ${protocolId}: inserted=${inserted}, skipped=${skipped}, errors=${errors} (${allTimestamps.size} timestamps)`)
  return { inserted, skipped, errors }
}

function groupByTimestamp(rows: AccountsRow[]): Map<number, AccountsRow[]> {
  const map = new Map<number, AccountsRow[]>()
  for (const row of rows) {
    const ts = row.start
    if (!map.has(ts)) map.set(ts, [])
    map.get(ts)!.push(row)
  }
  return map
}

main().catch((e) => {
  console.error('Migration failed:', e)
  process.exit(1)
})

