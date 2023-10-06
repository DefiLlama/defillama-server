import { TABLES, getAllProtocolItems, getLatestProtocolItem, syncTvlPostgresDB, } from '../db'
import { initCache, cache } from '../cache'
import * as fs from 'fs'
import craftProtocolV2 from '../utils/craftProtocolV2'
import PromisePool from '@supercharge/promise-pool'

async function main() {
  console.time('initCache')
  await initCache()
  console.timeEnd('initCache')

  console.time('syncTvlPostgresDB')
  await syncTvlPostgresDB()
  console.timeEnd('syncTvlPostgresDB')

/*   console.time('getAllProtocolItems')
  const items = await getAllProtocolItems(TABLES.DAILY_TVL, '2245')
  console.timeEnd('getAllProtocolItems')

  console.time('getLatestProtocolItem')
  const item = await getLatestProtocolItem(TABLES.DAILY_TVL, '2245')
  console.timeEnd('getLatestProtocolItem')

  console.log(items.length) */

  const res = await craftProtocolV2({
    protocolData: cache.protocolSlugMap['starfish-finance'],
    useNewChainNames: true,
    useHourlyData: false,
    skipAggregatedTvl: false,
  })
  fs.writeFileSync('test.json', JSON.stringify(res))
}

async function main1() {
  console.time('initCache')
  await initCache()
  console.timeEnd('initCache')

  const data = [...cache.metadata.protocols]
  shuffleArray(data)

  let count = 0
  console.time('PromisePool')
  await PromisePool.withConcurrency(42)
    .for(data)
    .process(async (i: any) => {
      const res = await craftProtocolV2({
        protocolData: i,
        useNewChainNames: true,
        useHourlyData: false,
        skipAggregatedTvl: false,
      })
      fs.writeFileSync(__dirname + '/tmp/' + i.name + '.json', JSON.stringify(res))
      console.log(`${++count}/${data.length}`, i.name)
    });
  console.timeEnd('PromisePool')
}

main().catch(console.error).then(() => process.exit(0))

function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}