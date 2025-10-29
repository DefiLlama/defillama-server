import { storeRouteData, } from "../cache/file-cache";
import * as sdk from '@defillama/sdk'
import { runWithRuntimeLogging } from "../utils";
import protocols from "../../protocols/data";
import { cexsData, cg_volume_cexs } from "../../protocols/cex";
import { getLatestProtocolItems } from "../db";
import { hourlyTvl, hourlyUsdTokensTvl } from "../../utils/getLastRecord";
import { pgGetInflows } from "../db/inflows";

const cacheKey = 'cron-task/cex-last-update';
const updatePeriodMs = 15 * 60 * 1000; // 15 minutes

const cexDataNameMap: { [name: string]: any } = {}
cexsData.forEach(c => {
  cexDataNameMap[c.name] = c
})

const cexes = protocols.filter(p => p.category === 'CEX')
const cexNameMap: { [name: string]: any } = {}
const cexIdMap: { [id: string]: any } = {}
cexes.forEach(c => {
  let name = c.name

  cexNameMap[c.name] = c
  cexIdMap[c.id] = c

  switch (name) {
    case 'Binance CEX': name = 'Binance'; break;
    case 'Crypto-com': name = 'Crypto.com'; break;
    case 'Nexo': name = 'NEXO'; break;
    case 'BitMake': name = 'Bitmake'; break;
  }


  const cexExtraData = cexDataNameMap[name]

  if (!cexExtraData) {
    console.warn(`CEX ${name} not found in cexsData`)
  } else {
    // const { name, ...rest } = cexExtraData
    Object.assign(c, cexExtraData)
  }

})
const cexesWithTvl = cexes.filter(p => p.module && p.module !== 'dummy.js')


// console.log(`CEX counts: total=${cexes.length}, withTvl=${cexesWithTvl.length}`)

async function _run() {


  const responseData: any = {
    cexs: cexsData, cg_volume_cexs, cex_data: cexes,
  }

  console.time('Fetching CEX TVL data for aggregation from db')

  const cexTvlIds = cexesWithTvl.map(c => c.id)
  const tsDayAgo = Math.floor(Date.now() / 1e3) - 24 * 3600
  const tsWeekAgo = Math.floor(Date.now() / 1e3) - 7 * 24 * 3600
  const tsMonthAgo = Math.floor(Date.now() / 1e3) - 30 * 24 * 3600


  const inflowIds = cexesWithTvl.map((c: any) => {
    const id: any = { id: c.id }
    if (c.coinSymbol) id.tokensToExclude = [c.coinSymbol]
    return id
  })

  const [
    tvlData, usdTokensTvl,
    inflows1d, inflows1w, inflows1m,
  ] = await Promise.all([
    getLatestProtocolItems(hourlyTvl, { filterLast24Hours: true, ids: cexTvlIds }),
    getLatestProtocolItems(hourlyUsdTokensTvl, { filterLast24Hours: true, ids: cexTvlIds }),
    pgGetInflows({ ids: inflowIds, startTimestamp: tsDayAgo }),
    pgGetInflows({ ids: inflowIds, startTimestamp: tsWeekAgo }),
    pgGetInflows({ ids: inflowIds, startTimestamp: tsMonthAgo }),
  ])

  // console.log(JSON.stringify({ tvlData, usdTokensTvl, inflows1d, inflows1w, inflows1m }))

  console.timeEnd('Fetching CEX TVL data for aggregation from db')

  // add current tvl to cex data
  tvlData.forEach((item: any) => {
    const cex = cexIdMap[item.id] as any
    
    if (!cex) {
      console.warn(`CEX with id ${item.id} not found in protocols data`)
      return
    }

    cex.currentTvl = item.data.tvl
  })

  // add current usd tokens tvl && clean assets tvl to cex data
  usdTokensTvl.forEach((item: any) => {
    const cex = cexIdMap[item.id] as any

    if (!cex) {
      console.warn(`CEX with id ${item.id} not found in protocols data`)
      return
    }

    cex.currentUsdTokensTvl = item.data.tvl

    // clean assets tvl
    if (!cex.coinSymbol) cex.cleanAssetsTvl = cex.currentTvl
    else {
      const coinTvl = item.data.tvl[cex.coinSymbol] || 0
      cex.cleanAssetsTvl = cex.currentTvl - coinTvl
    }
  })

  // add inflows data
  Object.entries(inflows1d).map(addInflowsDataToCex('inflows_24h'))
  Object.entries(inflows1w).map(addInflowsDataToCex('inflows_1w'))
  Object.entries(inflows1m).map(addInflowsDataToCex('inflows_1m'))

  await storeRouteData('cex_agg', responseData)

  function addInflowsDataToCex(fieldName: string) {
    return ([id, item]: any) => {
      const cex = cexIdMap[id] as any

      if (!cex) {
        console.warn(`CEX with id ${id} not found in protocols data`)
        return
      }

      cex[fieldName] = item
    }
  }
}

async function run() {
  const now = Date.now()
  const { lastUpdateTS } = (await sdk.cache.readExpiringJsonCache(cacheKey)) ?? { lastUpdateTS: 0 }
  // only run if last update was more than 15 minutes ago
  if (now - lastUpdateTS < updatePeriodMs) {
    console.log('Last cex data pull was less than 15 minutes ago, skipping')
    return
  }

  await runWithRuntimeLogging(_run, {
    application: "cron-task",
    type: 'cex',
  })

  await sdk.cache.writeExpiringJsonCache(cacheKey, { lastUpdateTS: now }, { expireAfter: updatePeriodMs })
}

_run().catch(console.error).then(() => process.exit(0))