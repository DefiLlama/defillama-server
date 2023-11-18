import { TABLES, getAllProtocolItems, getLatestProtocolItem, initializeTVLCacheDB, getLatestProtocolItems, readFromPGCache, } from '../db'
import { initCache, cache } from '../cache'
import * as fs from 'fs'
import craftProtocolV2 from '../utils/craftProtocolV2'
import { dailyTvl, hourlyTvl, } from '../../utils/getLastRecord'
import { PROTOCOL_METADATA_ALL_KEY } from '../constants'
import { log } from '@defillama/sdk'
import { PromisePool } from "@supercharge/promise-pool";

async function main() {

  console.time('initializeTVLCacheDB')
  await initializeTVLCacheDB()
  console.timeEnd('initializeTVLCacheDB')

  console.time('PROTOCOL_METADATA_ALL_KEY')
  const metadata = await readFromPGCache(PROTOCOL_METADATA_ALL_KEY)
  const { protocols } = metadata
  console.timeEnd('PROTOCOL_METADATA_ALL_KEY')


  console.time('getLatestProtocolItems filterLast24Hours')
  const latestProtocolItems = await getLatestProtocolItems(hourlyTvl, { filterLast24Hours: true })
  const latestProtocolItemsMap: any = {}
  latestProtocolItems.forEach((data: any) => latestProtocolItemsMap[data.id] = data.data)
  console.timeEnd('getLatestProtocolItems filterLast24Hours')


  console.time('getLatestProtocolItems filterADayAgo')
  const latestProtocolItemsDayAgo = await getLatestProtocolItems(hourlyTvl, { filterADayAgo: true })
  const latestProtocolItemsDayAgoMap: any = {}
  latestProtocolItemsDayAgo.forEach((data: any) => latestProtocolItemsDayAgoMap[data.id] = data.data)
  console.timeEnd('getLatestProtocolItems filterADayAgo')

  console.time('getLatestProtocolItems filterAWeekAgo')
  const latestProtocolItemsWeekAgo = await getLatestProtocolItems(hourlyTvl, { filterAWeekAgo: true })
  const latestProtocolItemsWeekAgoMap: any = {}
  latestProtocolItemsWeekAgo.forEach((data: any) => latestProtocolItemsWeekAgoMap[data.id] = data.data)
  console.timeEnd('getLatestProtocolItems filterAWeekAgo')

  console.time('getLatestProtocolItems filterAMonthAgo')
  const latestProtocolItemsMonthAgo = await getLatestProtocolItems(hourlyTvl, { filterAMonthAgo: true })
  const latestProtocolItemsMonthAgoMap: any = {}
  latestProtocolItemsMonthAgo.forEach((data: any) => latestProtocolItemsMonthAgoMap[data.id] = data.data)
  console.timeEnd('getLatestProtocolItems filterAMonthAgo')

  console.time('getAllProtocolItems')
  const protocolDataMap: { [key: string]: any } = {}
  metadata.protocolDataMap = protocolDataMap
  
  let i = 0
  await PromisePool.withConcurrency(20)
    .for(protocols)
    .process(async (protocol: any) => {
      try {
        const dataObj: any = {}
        protocolDataMap[protocol.id] = dataObj
        const tvlData = await getAllProtocolItems(dailyTvl, protocol.id)

        const hourlyItem = latestProtocolItemsMap[protocol.id]
        dataObj.tvlData = tvlData
        dataObj.lastHourlyRecord = hourlyItem
        dataObj.tvlADayAgo = latestProtocolItemsDayAgoMap[protocol.id]
        dataObj.tvlAWeekAgo = latestProtocolItemsWeekAgoMap[protocol.id]
        dataObj.tvlAMonthAgo = latestProtocolItemsMonthAgoMap[protocol.id]

        if (hourlyItem) {
          if (!tvlData.length || tvlData[tvlData.length - 1].SK < hourlyItem.SK)
            tvlData.push(hourlyItem)
        }
        i++
        if (i % 100 === 0) log(i, 'tvlData.length', tvlData.length, !!hourlyItem, protocol.name)
      } catch (e) {
        console.error(e)
      }
    });
  console.timeEnd('getAllProtocolItems')


  /* console.time('allTvlData')
  let limit = 100000
  let offset = 0
  const allTvlData: any[] = []
  let lastLength
  do {
    lastLength = allTvlData.length
    const res = await TABLES.DAILY_TVL.findAll({ limit, offset, raw: true, attributes: ['id', 'data', 'timestamp'] })
    allTvlData.push(...res)
    offset += limit
    log('allTvlData.length', allTvlData.length)
  } while (allTvlData.length % limit === 0 && allTvlData.length !== lastLength)
  console.timeEnd('allTvlData')
 */

  /*   console.time('allTvlDataMap')
    const protocolMap: any = {}
    protocols.forEach((protocol: any) => protocolMap[protocol.id] = protocol)
    allTvlData.forEach(({ id, data, timestamp }: any) => {
      data.SK = timestamp
      const protocol = protocolMap[id]
      if (protocol) {
        if (!Array.isArray(protocol.tvlData)) protocol.tvlData = []
        protocol.tvlData.push(data)
      }
    })
    protocols.forEach((protocol: any) => {
      if (Array.isArray(protocol.tvlData))
        protocol.tvlData.sort((a: any, b: any) => a.SK - b.SK)
      const hourlyItem = latestProtocolItemsMap[protocol.id]
      if (hourlyItem) {
        if (!protocol.tvlData.length || protocol.tvlData[protocol.tvlData.length - 1].SK !== hourlyItem.SK)
          protocol.tvlData.push(hourlyItem)
      }
      if (!Array.isArray(protocol.tvlData)) protocol.tvlData = []
  
    })
    console.timeEnd('allTvlDataMap') */


  console.time('write data')
  fs.writeFileSync('../../allTvlData.json', JSON.stringify(metadata))
  console.timeEnd('write data')
}

async function main1() {
  const data = fs.readFileSync('../../allTvlData.json', 'utf8')
  const metadata = JSON.parse(data)
  const { protocols, protocolDataMap } = metadata
  console.log('protocols.length', protocols.length)
  const protocolsWithData = protocols.filter((protocol: any) => protocolDataMap[protocol.id]?.tvlData?.length)
  console.log('protocolsWithData.length', protocolsWithData.length)
}
main1().catch(console.error).then(() => process.exit(0))
