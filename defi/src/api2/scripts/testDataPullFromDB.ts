import { TABLES, getAllProtocolItems, getLatestProtocolItem, initializeTVLCacheDB, getLatestProtocolItems, } from '../db'
import { initCache, cache } from '../cache'
import * as fs from 'fs'
import craftProtocolV2 from '../utils/craftProtocolV2'
import PromisePool from '@supercharge/promise-pool'
import { dailyTvl, hourlyTvl, } from '../../utils/getLastRecord'
import { shuffleArray } from '../../utils/shared/shuffleArray'

async function main() {

  console.time('initializeTVLCacheDB')
  await initializeTVLCacheDB()
  console.timeEnd('initializeTVLCacheDB')

  console.time('initCache')
  await initCache()
  console.timeEnd('initCache')

  // console.time('getLatestProtocolItems dailyTvl')
  // const dailyTvlres = await getLatestProtocolItems(dailyTvl)
  // console.timeEnd('getLatestProtocolItems dailyTvl')

  // console.time('getLatestProtocolItems hourlyTvl')
  // const hourlyTvlRes = await getLatestProtocolItems(hourlyTvl)
  // console.timeEnd('getLatestProtocolItems hourlyTvl')

  //  const res = await craftProtocolV2({
  //   protocolData: cache.protocolSlugMap['starfish-finance'],
  //   useNewChainNames: true,
  //   useHourlyData: false,
  //   skipAggregatedTvl: false,
  // })
  // fs.writeFileSync('test.json', JSON.stringify(res))
  // fs.writeFileSync('test_dailyTvlres.json', JSON.stringify(dailyTvlres))

  console.time('getLatestProtocolItems hourlyTvl')
  const hourlyTvlRes2 = await getLatestProtocolItems(hourlyTvl, { filterLast24Hours: true })
  console.timeEnd('getLatestProtocolItems hourlyTvl')
  fs.writeFileSync('test_hourlyTvlRes.json', JSON.stringify(hourlyTvlRes2))
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
