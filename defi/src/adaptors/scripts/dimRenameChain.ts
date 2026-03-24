require("dotenv").config();
import * as readline from 'readline'
import { TABLES, initializeTVLCacheDB } from '../db/index'
import { ADAPTER_TYPES, AdapterType } from '../../adaptors/types'
import { getDimensionsCacheV2 } from '../utils/dimensionsUtils'
import { DIMENSIONS_ADAPTER_CACHE } from '../../adaptors/data/types'

// ── Config ──────────────────────────────────────────────────────────────────────
const OLD_CHAIN = process.argv[2] || 'undefined'
const NEW_CHAIN = process.argv[3] || 'sx'
let DRY_RUN = !process.argv.includes('--live')
DRY_RUN = false
// ─────────────────────────────────────────────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
function ask(question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve))
}

type MatchedRecord = { id: string, timeS: string }

function findRecordsWithChain(cache: DIMENSIONS_ADAPTER_CACHE, chain: string): MatchedRecord[] {
  const matched: MatchedRecord[] = []
  for (const [id, protocol] of Object.entries(cache.protocols ?? {})) {
    for (const [timeS, record] of Object.entries(protocol.records ?? {})) {
      const aggObject = record.aggObject
      if (!aggObject) continue
      for (const metric of Object.values(aggObject) as any[]) {
        if (metric?.chains && metric.chains[chain] !== undefined) {
          matched.push({ id, timeS })
          break
        }
      }
    }
  }
  return matched
}

function renameChainInData(obj: any, oldChain: string, newChain: string): boolean {
  if (!obj?.aggregated) return false
  let changed = false
  for (const metric of Object.values(obj.aggregated) as any[]) {
    if (metric?.chains && metric.chains[oldChain] !== undefined) {
      metric.chains[newChain] = metric.chains[oldChain]
      delete metric.chains[oldChain]
      changed = true
    }
  }
  return changed
}

function renameChainInBreakdown(obj: any, oldChain: string, newChain: string): boolean {
  if (!obj || typeof obj !== 'object') return false
  let changed = false
  for (const key of Object.keys(obj)) {
    const val = obj[key]
    if (val && typeof val === 'object') {
      if (val[oldChain] !== undefined) {
        val[newChain] = val[oldChain]
        delete val[oldChain]
        changed = true
      }
      for (const innerVal of Object.values(val) as any[]) {
        if (innerVal && typeof innerVal === 'object' && !Array.isArray(innerVal)) {
          if (innerVal[oldChain] !== undefined) {
            innerVal[newChain] = innerVal[oldChain]
            delete innerVal[oldChain]
            changed = true
          }
        }
      }
    }
  }
  return changed
}

async function run() {
  console.log(`\n  Chain rename: "${OLD_CHAIN}" → "${NEW_CHAIN}"`)
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (pass --live to write)' : '🔴 LIVE — will modify DB'}\n`)

  await initializeTVLCacheDB()

  console.log('  Loading dimensions cache...')
  const allCache = await getDimensionsCacheV2() as Record<AdapterType, DIMENSIONS_ADAPTER_CACHE>
  console.log('  Cache loaded.\n')

  for (const adapterType of ADAPTER_TYPES) {
    console.log(`── ${adapterType} ${'─'.repeat(60 - adapterType.length)}`)

    const cache = allCache[adapterType]
    if (!cache?.protocols) {
      console.log(`  No cache data`)
      continue
    }

    const matched = findRecordsWithChain(cache, OLD_CHAIN)
    if (!matched.length) {
      console.log(`  No records with chain "${OLD_CHAIN}"`)
      continue
    }

    const protocolGroups: Record<string, string[]> = {}
    for (const { id, timeS } of matched) {
      if (!protocolGroups[id]) protocolGroups[id] = []
      protocolGroups[id].push(timeS)
    }

    console.log(`  Found ${matched.length} records across ${Object.keys(protocolGroups).length} protocol(s):\n`)
    const idWidth = Math.max(11, ...matched.map(r => r.id.length))
    console.log(`  ${'Protocol ID'.padEnd(idWidth)}  timeS`)
    console.log(`  ${'─'.repeat(idWidth)}  ${'─'.repeat(12)}`)
    for (const { id, timeS } of matched) {
      console.log(`  ${id.padEnd(idWidth)}  ${timeS}`)
    }

    if (DRY_RUN) {
      console.log(`  [DRY RUN] Skipping updates`)
      continue
    }

    const answer = await ask(`  Update these ${matched.length} records? (y/n): `)
    if (answer.trim().toLowerCase() !== 'y') {
      console.log(`  Skipped`)
      continue
    }

    let updated = 0
    for (const { id, timeS } of matched) {
      const record = await TABLES.DIMENSIONS_DATA.findOne({
        where: { id, timeS, type: adapterType },
      }) as any
      if (!record) {
        console.log(`    ⚠ Record missing: id=${id} timeS=${timeS} type=${adapterType}`)
        continue
      }

      let changed = false
      if (record.dataValues.data) changed = renameChainInData(record.dataValues.data, OLD_CHAIN, NEW_CHAIN) || changed
      for (const field of ['bl', 'blc', 'tb', 'tbl', 'tblc'] as const) {
        if (record.dataValues[field]) changed = renameChainInBreakdown(record.dataValues[field], OLD_CHAIN, NEW_CHAIN) || changed
      }

      if (!changed) continue

      await record.destroy()
      await TABLES.DIMENSIONS_DATA.create({
        ...record.dataValues,
        data: record.dataValues.data,
        bl: record.dataValues.bl,
        blc: record.dataValues.blc,
        tb: record.dataValues.tb,
        tbl: record.dataValues.tbl,
        tblc: record.dataValues.tblc,
        updatedAt: new Date(),
      })
      updated++
    }
    console.log(`  ✓ Updated ${updated} records`)
  }

  console.log(`\nDone.`)
  rl.close()
  await TABLES.DIMENSIONS_DATA.sequelize?.close()
  process.exit(0)
}

run().catch(err => {
  console.error(err)
  rl.close()
  process.exit(1)
})
