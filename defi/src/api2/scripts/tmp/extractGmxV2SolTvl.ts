import { dailyTvl, dailyRawTokensTvl, dailyTokensTvl, dailyUsdTokensTvl, } from '../../../utils/getLastRecord'
import { initializeTVLCacheDB, getAllProtocolItems, saveProtocolItem, closeConnection } from '../../db/index'

const SOURCE_ID = '3365' // GMX v2
const TARGET_ID = '7297'
const CHAIN = 'solana'

async function run() {
  await initializeTVLCacheDB()

  await runFor(dailyTvl, 'GMX v2 Solana TVL')
  await runFor(dailyTokensTvl, 'GMX v2 Solana Tokens TVL')
  await runFor(dailyUsdTokensTvl, 'GMX v2 Solana USD Tokens TVL')
  await runFor(dailyRawTokensTvl, 'GMX v2 Solana Raw Tokens TVL')

  await closeConnection()
}

async function runFor(fn: typeof dailyTvl, label: string) {

  console.log(`Fetching daily TVL records for GMX v2 (id: ${SOURCE_ID})...`)
  const records = await getAllProtocolItems(fn, SOURCE_ID)

  if (!records || records.length === 0) {
    console.log('No records found for GMX v2')
    return
  }

  console.log(`Found ${records.length} records`, label)

  let processedCount = 0
  let skippedCount = 0

  for (const record of records) {
    const chainTvl = record?.[CHAIN]
    if (chainTvl === undefined) {
      skippedCount++
      continue
    }
    const data = {
      tvl: chainTvl,
      [CHAIN]: chainTvl
    }

    await saveProtocolItem(fn, { id: TARGET_ID, timestamp: record.SK, data, overwriteExistingData: true })
    processedCount++

    if (processedCount % 100 === 0) {
      console.log(`Processed ${processedCount} records...`)
    }
  }

  console.log(`Done! Processed ${processedCount} records, skipped ${skippedCount} records without ${CHAIN.toUpperCase()} ${label}.`)
}

run()
  .catch(console.error)
  .then(() => process.exit(0))
