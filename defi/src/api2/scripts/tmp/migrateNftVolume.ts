require("dotenv").config();
import { initializeTVLCacheDB, TABLES } from '../../db/index'
import { getTimestampString } from '../../utils'
import { getHistoricalValues } from "../../../utils/shared/dynamodb"
import { AdapterType, AdaptorRecordType } from "../../../adaptors/data/types"

const CHAIN_NAMES = ["ethereum", "optimism", "flow", "avalanche", "immutablex", "ronin", "polygon", "solana", "cardano"]
const DRY_RUN = process.argv.includes('--dry-run')

function toStartOfDay(unixTimestamp: number) {
  const date = new Date(unixTimestamp * 1e3)
  date.setUTCHours(0, 0, 0, 0)
  return Math.floor(date.getTime() / 1000)
}

async function main() {
  await initializeTVLCacheDB()

  // Pull data for each chain from DDB
  const chainData: Record<string, { timestamp: number, volume: number }[]> = {}

  for (const chain of CHAIN_NAMES) {
    const pk = `nft#${chain}`
    const items = await getHistoricalValues(pk)

    if (!items.length) {
      console.log(`${chain}: no data`)
      continue
    }

    // Sort by SK (timestamp)
    items.sort((a: any, b: any) => a.SK - b.SK)

    const firstDate = new Date(items[0].SK * 1000).toISOString().slice(0, 10)
    const lastDate = new Date(items[items.length - 1].SK * 1000).toISOString().slice(0, 10)
    console.log(`${chain}: ${items.length} records, first: ${firstDate}, last: ${lastDate}`)

    chainData[chain] = items.map((item: any) => ({
      timestamp: item.SK,
      volume: Number(item.volume),
    })).filter(i => !isNaN(i.volume) && i.volume > 0)
  }

  const batch: any[] = []

  for (const [chain, entries] of Object.entries(chainData)) {
    // Group by timeS (date string), keeping the latest timestamp's volume per day
    const byDay = new Map<string, { volume: number, timestamp: number }>()
    for (const { timestamp, volume } of entries) {
      const timeS = getTimestampString(timestamp)
      const existing = byDay.get(timeS)
      if (!existing || timestamp > existing.timestamp) {
        byDay.set(timeS, { volume, timestamp })
      }
    }

    for (const [timeS, { volume: totalValue }] of [...byDay.entries()].sort()) {
      if (totalValue < 0) continue

      // Derive start-of-day unix timestamp from the date string
      const dayTs = Math.floor(new Date(timeS + 'T00:00:00Z').getTime() / 1000)

      batch.push({
        id: `chain#${chain}`,
        type: AdapterType.NFT_VOLUME,
        timeS,
        timestamp: dayTs,
        data: {
          aggregated: {
            [AdaptorRecordType.dailyVolume]: {
              value: totalValue,
              chains: { [chain]: totalValue },
            }
          }
        },
        bl: null,
        blc: null,
        tb: null,
        tbl: null,
        tblc: null,
      })
    }

    console.log(`  ${chain}: ${byDay.size} daily records prepared`)
  }

  console.log(`Prepared ${batch.length} dimension records`)

  if (DRY_RUN) {
    console.log('\nDRY RUN - sample records:')
    for (const r of batch.slice(0, 3)) {
      console.log(JSON.stringify(r, null, 2))
    }
    console.log(`\nWould insert ${batch.length} records`)
  } else {
    await TABLES.DIMENSIONS_DATA.bulkCreate(batch, {
      updateOnDuplicate: ['timestamp', 'data', 'bl', 'blc', 'tb', 'tbl', 'tblc']
    })
    console.log(`Inserted ${batch.length} records`)
  }

  await TABLES.DIMENSIONS_DATA.sequelize?.close()
  process.exit(0)
}

main().catch((e) => {
  console.error('Migration failed:', e)
  process.exit(1)
})
