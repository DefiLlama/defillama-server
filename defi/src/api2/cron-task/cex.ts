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
const cexIdMap2: { [id: string]: any } = {}
const cexCgIdMap: { [id: string]: any } = {}
const cexCgDerivIdMap: { [id: string]: any } = {}
cexsData.forEach(c => {
  cexDataNameMap[c.name] = c
  if (c.cgId) cexCgIdMap[c.cgId] = c
  if (c.slug) cexCgIdMap[c.slug] = c
  if (c.cgSpotId) {
    cexCgIdMap[c.cgSpotId] = c
  }
  if (c.cgDeriv) cexCgDerivIdMap[c.cgDeriv] = c
})

const cexes = protocols.filter(p => p.category === 'CEX')
const cexNameMap: { [name: string]: any } = {}
const cexMetadataIdMap: { [id: string]: any } = {}



cexes.forEach(c => {
  let name = c.name

  cexNameMap[c.name] = c
  cexMetadataIdMap[c.id] = c

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
    cexIdMap2[c.id] = cexExtraData

    // const { name, ...rest } = cexExtraData
    Object.assign(c, cexExtraData)
  }

})
const cexesWithTvl = cexes.filter(p => p.module && p.module !== 'dummy.js')


// console.log(`CEX counts: total=${cexes.length}, withTvl=${cexesWithTvl.length}`)

async function _run() {
  const responseData: any = {
    cexs: cexsData, cg_volume_cexs,
  }

  // Add asset data: tvl, inflows
  await addAssetData()

  // Add cex spot and deriv volume
  await addSpotAndDerivData()


  await storeRouteData('cex_agg', responseData)
}

async function addAssetData() {
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
    const cex = cexIdMap2[item.id] as any

    if (!cex) {
      console.warn(`CEX with id ${item.id} not found in protocols data tvl name: ${cexMetadataIdMap[item.id]?.name}`)
      return
    }

    cex.currentTvl = item.data.tvl
  })

  // add current usd tokens tvl && clean assets tvl to cex data
  usdTokensTvl.forEach((item: any) => {
    const cex = cexIdMap2[item.id] as any

    if (!cex) {
      console.warn(`CEX with id ${item.id} not found in protocols data usd tokens tvl: ${cexMetadataIdMap[item.id]?.name}`)
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

  function addInflowsDataToCex(fieldName: string) {
    return ([id, item]: any) => {
      const cex = cexIdMap2[id] as any

      if (!cex) {
        console.warn(`CEX with id ${id} not found in protocols data: ${fieldName} ${cexMetadataIdMap[item.id]?.name}`)
        return
      }

      cex[fieldName] = item
    }
  }

}

async function addSpotAndDerivData() {
  const SPOT_DATA_URL = 'https://api.coingecko.com/api/v3/exchanges?per_page=1000'
  const DERIV_DATA_URL = "https://api.coingecko.com/api/v3/derivatives/exchanges?per_page=1000"

  const spotData = await sdk.cache.cachedFetch({ endpoint: SPOT_DATA_URL, key: 'cex/cex-cg-spot-data', }) as any[]
  const derivData = await sdk.cache.cachedFetch({ endpoint: DERIV_DATA_URL, key: 'cex/cex-cg-deriv-data', }) as any[]
  const { ['coingecko:bitcoin']: { price: btcPrice } } = await sdk.coins.getPrices(['coingecko:bitcoin'], 'now') as any


  spotData.forEach((item: any) => {
    const cex = cexCgIdMap[item.id] as any
    if (!cex) {
      // console.warn(`CEX with cgId ${item.id} not found in protocols data spot volume: ${item.name}`)
      return
    }

    cex.spotVolume = item.trade_volume_24h_btc * btcPrice
  })

  derivData.forEach((item: any) => {
    const cex = cexCgDerivIdMap[item.id] as any
    if (!cex) {
      // console.warn(`CEX with cgDeriv ${item.id} not found in protocols data deriv volume: ${item.name}`)
      return
    }

    cex.oi = item.open_interest_btc * btcPrice
    cex.derivVolume = item.trade_volume_24h_btc * btcPrice
    if (cex.cleanAssetsTvl)
      cex.leverage = cex.oi / cex.cleanAssetsTvl
  })
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

run().catch(console.error).then(() => process.exit(0))