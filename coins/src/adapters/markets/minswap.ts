import { log } from '@defillama/sdk'
import { Write, } from "../utils/dbInterfaces";
import { addToDBWritesList, getTokenAndRedirectData, } from "../utils/database";
import { getCache, setCache, } from "../../utils/cache";
import fetch from "node-fetch";
import axios from 'axios'
import { PromisePool } from '@supercharge/promise-pool'
import { off } from 'process';

export function minswap(timestamp: number) {
  console.log("starting minswap");
  return Promise.all([
    getTokenPrices(timestamp),
  ])
}
const chain = 'cardano'

async function getPools() {
  let limit = 20
  let offset = 0
  const pools = []
  let fetchMorePools = true
  do {
    const { data: { data: { topPools }} } = await axios.post('https://monorepo-mainnet-prod.minswap.org/graphql', {
      "query": "\n    query TopPools($input: TopPoolsInput) {\n  topPools(input: $input) {\n    assetA {\n      currencySymbol\n      tokenName\n      isVerified\n      ...allMetadata\n    }\n    assetB {\n      currencySymbol\n      tokenName\n      isVerified\n      ...allMetadata\n    }\n    reserveA\n    reserveB\n    lpAsset {\n      currencySymbol\n      tokenName\n    }\n    totalLiquidity\n    reserveADA\n    volumeADAByDay\n    volumeADAByWeek\n    tradingFeeAPR\n    pendingOrders {\n      limit\n      processing\n      overSlippage\n      total\n    }\n    profitSharing {\n      feeTo\n    }\n  }\n}\n    \n    fragment allMetadata on Asset {\n  metadata {\n    name\n    ticker\n    url\n    decimals\n    description\n  }\n}\n    ",
      "variables": {
        "input": {
          "asset": "",
          "sortBy": {
            "column": "TVL",
            "type": "DESC"
          },
          "onlyVerified": false,
          "pagination": {
            "offset": offset,
            "limit": limit
          }
        }
      }
    })
    offset += limit
    const adaPools = topPools.filter((i: any) => i.assetA.currencySymbol === '' && i.assetA.isVerified && i.assetB.metadata)
    const filteredPools = adaPools.filter((i: any) => i.reserveA > 1e9) // ignore pools with less than 1000 ADA
    fetchMorePools = filteredPools.length === adaPools.length
    pools.push(...filteredPools)
    log('pools', pools.length, offset, fetchMorePools)

  } while (fetchMorePools)
  log('pool count', pools.length)
  return pools
}

async function getTokenPrices(timestamp: number) {

  const writes: Write[] = [];
  let pools = await getPools()
  const basePrice = await getTokenAndRedirectData(['cardano'], 'coingecko', timestamp)
  const cardanoPrice = basePrice[0].price
  addToDBWritesList(writes, chain, '0x0000000000000000000000000000000000000000', cardanoPrice, 6, 'ADA', timestamp, 'minswap', 0.9)
  addToDBWritesList(writes, chain, 'lovelace', cardanoPrice, 6, 'ADA', timestamp, 'minswap', 0.9)
  const priceLog: any[] = []
  pools.forEach(({assetB: { currencySymbol, metadata: { name, ticker, decimals } }, reserveA, reserveB}: any) => {
    const token = currencySymbol.toLowerCase()
    const symbol = (ticker || name).replace(/ /g, '-').toUpperCase()
    const price = reserveA * (10 ** (decimals - 6)) / reserveB 
    priceLog.push({ symbol, price: Number(cardanoPrice * price).toFixed(4),  decimals, ticker, name})
    addToDBWritesList(writes, chain, token, cardanoPrice * price, decimals, symbol, timestamp, 'minswap', 0.9)
  })
  // console.table(priceLog)

  return writes
}

async function getDecimals(ids: string[]) {

  let cache = await getCache('decimals', chain)

  if (!cache.decimals)
    cache = { decimals: {}, failed: [] }
  cache.failed = [] // we dont cache failed for now
  ids = ids.filter(i => typeof cache.decimals[i] !== 'number')

  await PromisePool
    .withConcurrency(7)
    .for(ids)
    .process(async (id: any) => {
      try {
        const data = await fetch(`https://raw.githubusercontent.com/cardano-foundation/cardano-token-registry/master/mappings/${id}.json`).then(r => r.json())
        cache.decimals[id] = data.decimals?.value ?? 0
      } catch (e) { cache.failed.push(id) }
    })

  await setCache('decimals', chain, cache)
  return cache.decimals
}
