import { TABLES, getAllProtocolItems, getLatestProtocolItem, syncTvlPostgresDB, } from '../db'
import * as fs from 'fs'

async function main() {
  await syncTvlPostgresDB()
  console.time('getAllProtocolItems')
  const items = await getAllProtocolItems(TABLES.DAILY_TVL, '2245')
  console.timeEnd('getAllProtocolItems')
  console.time('getLatestProtocolItem')
  const item = await getLatestProtocolItem(TABLES.DAILY_TVL, '2245')
  console.timeEnd('getLatestProtocolItem')
  console.log(items.length)
  fs.writeFileSync('test.json', JSON.stringify({items, item}, null, 2))
}

main()