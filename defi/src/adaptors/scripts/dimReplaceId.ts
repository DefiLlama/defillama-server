require("dotenv").config();

import * as readline from 'readline'
import * as fs from 'fs'
import { TABLES, initializeTVLCacheDB } from '../../api2/db/index'
import { ADAPTER_TYPES } from '../data/types'

// ── Config ──────────────────────────────────────────────────────────────────────
const OLD_ID = process.argv[2] ?? '2175'
const NEW_ID = process.argv[3] ?? '2175'
const OLD_TYPE = 'derivatives'
const NEW_TYPE = 'dexs'
// ─────────────────────────────────────────────────────────────────────────────────

if (!OLD_ID || !NEW_ID) {
  console.error('Usage: npx ts-node src/adaptors/scripts/dimReplaceId.ts <oldId> <newId>')
  process.exit(1)
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
function ask(question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve))
}

async function run() {
  console.log(`\n  Replace protocol ID: "${OLD_ID}" → "${NEW_ID}"`)

  await initializeTVLCacheDB()

  // Pull all records for the old ID
  const records = await TABLES.DIMENSIONS_DATA.findAll({
    where: { id: OLD_ID, type: OLD_TYPE },
    order: [['timeS', 'ASC']],
  }) as any[]

  if (!records.length) {
    console.log(`\n  No records found for id="${OLD_ID}"`)
    rl.close()
    await TABLES.DIMENSIONS_DATA.sequelize?.close()
    process.exit(0)
  }

  // ── Stats ───────────────────────────────────────────────────────────────────
  const byType: Record<string, { count: number, earliest: string, latest: string, metrics: Set<string> }> = {}

  for (const record of records) {
    const { type, timeS, data } = record.dataValues
    if (!byType[type]) byType[type] = { count: 0, earliest: timeS, latest: timeS, metrics: new Set() }
    const entry = byType[type]
    entry.count++
    if (timeS < entry.earliest) entry.earliest = timeS
    if (timeS > entry.latest) entry.latest = timeS

    // Collect metric keys
    const aggregated = data?.aggregated
    if (aggregated) {
      for (const key of Object.keys(aggregated)) entry.metrics.add(key)
    }
  }

  console.log(`\n  Total records: ${records.length}`)
  console.log(`\n  Breakdown by adapter type:`)
  console.log(`  ${'─'.repeat(90)}`)
  console.log(`  ${'Type'.padEnd(25)} ${'Count'.padStart(7)} ${'Earliest'.padEnd(12)} ${'Latest'.padEnd(12)} Metrics`)
  console.log(`  ${'─'.repeat(90)}`)
  for (const [type, stats] of Object.entries(byType)) {
    console.log(`  ${type.padEnd(25)} ${String(stats.count).padStart(7)} ${stats.earliest.padEnd(12)} ${stats.latest.padEnd(12)} ${[...stats.metrics].join(', ')}`)
  }
  console.log(`  ${'─'.repeat(90)}`)

  // Check if target ID already has records
  const existingNewRecords = await TABLES.DIMENSIONS_DATA.findAll({
    where: { id: NEW_ID, type: NEW_TYPE },
  }) as any[]

  if (existingNewRecords.length) {
    console.log(`\n  ⚠ Target id="${NEW_ID}" already has ${existingNewRecords.length} records.`)

    // Check for overlapping (type, timeS) keys
    const existingKeys = new Set(existingNewRecords.map((r: any) => `${r.dataValues.type}:${r.dataValues.timeS}`))
    const overlapping = records.filter((r: any) => existingKeys.has(`${r.dataValues.type}:${r.dataValues.timeS}`))
    if (overlapping.length) {
      console.log(`  ⚠ ${overlapping.length} records overlap (same type+timeS). These will be SKIPPED to avoid data loss.`)
    }
  }

  // ── Confirmation ────────────────────────────────────────────────────────────
  const answer = await ask(`\n  Replace ${records.length} records from id="${OLD_ID}" to id="${NEW_ID}"? (y/n): `)
  if (answer.trim().toLowerCase() !== 'y') {
    console.log('  Aborted.')
    rl.close()
    await TABLES.DIMENSIONS_DATA.sequelize?.close()
    process.exit(0)
  }

  // ── Backup ──────────────────────────────────────────────────────────────────
  const backupFile = `dimReplaceId_backup_${OLD_ID}_${Date.now()}.json.log`
  fs.writeFileSync(backupFile, JSON.stringify(records.map((r: any) => r.dataValues)))
  console.log(`\n  Backup saved to ${backupFile}`)

  // ── Build set of existing keys for the new ID to skip overlaps ─────────────
  const existingKeys = new Set(existingNewRecords.map((r: any) => `${r.dataValues.type}:${r.dataValues.timeS}`))

  // ── Replace one by one ──────────────────────────────────────────────────────
  let replaced = 0
  let skipped = 0

  for (const record of records) {
    const { type, timeS } = record.dataValues
    const key = `${type}:${timeS}`

    if (existingKeys.has(key)) {
      skipped++
      continue
    }

    try {
      await record.destroy()
      await TABLES.DIMENSIONS_DATA.create({
        ...record.dataValues,
        id: NEW_ID,
        type: NEW_TYPE,
        data: record.dataValues.data,
        bl: record.dataValues.bl,
        blc: record.dataValues.blc,
        tb: record.dataValues.tb,
        tbl: record.dataValues.tbl,
        tblc: record.dataValues.tblc,
        updatedAt: new Date(),
      })
      replaced++
      if (replaced % 50 === 0) console.log(`  ... replaced ${replaced} records`)
    } catch (e: any) {
      console.error(`  ✗ Failed on type=${type} timeS=${timeS}: ${e.message}`)
    }
  }

  console.log(`\n  Done. Replaced: ${replaced}, Skipped (overlap): ${skipped}`)

  rl.close()
  await TABLES.DIMENSIONS_DATA.sequelize?.close()
  process.exit(0)
}

run().catch(err => {
  console.error(err)
  rl.close()
  process.exit(1)
})
