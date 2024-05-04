import { log } from '@defillama/sdk'
import { Write, } from "../utils/dbInterfaces";
import { addToDBWritesList, getTokenAndRedirectData, } from "../utils/database";
import axios from 'axios'


export function sundaeswap(timestamp: number) {
  
  const THIRY_MINUTES = 1800
  if (+timestamp !== 0 && timestamp < (+new Date() / 1e3 - THIRY_MINUTES))
    throw new Error("Can't fetch historical data")

  return Promise.all([
    getTokenPrices(timestamp),
  ])
}
const chain = 'cardano'

async function getPools() {
  const pools = []
  const { data: { data: { poolsPopular: topPools } } } = await axios.post('https://stats.sundaeswap.finance/graphql', {
    "query": "query getPopularPools($pageSize: Int) {\n  poolsPopular(pageSize: $pageSize) {\n    ...ExtendPoolFragment\n  }\n}\n\nfragment ExtendPoolFragment on Pool {\n  ...PoolFragment\n  ...PoolInfoFragment\n}\n\nfragment PoolFragment on Pool {\n  assetA {\n    ...AssetFragment\n  }\n  assetB {\n    ...AssetFragment\n  }\n  quantityA\n  quantityB\n    ident\n  assetID\n}\n\nfragment AssetFragment on Asset {\n  assetId\n  policyId\n  assetName\n  decimals\n  logo\n  ticker\n  dateListed\n  sources\n}\n\nfragment PoolInfoFragment on Pool {\n  tvl\n  name\n  priceUSD\n}\n",
    "variables": { "pageSize": 999 },
    "operationName": "getPopularPools"
  })
  const adaPools = topPools.filter((i: any) => !i.assetA.assetName && i.assetA.ticker === 'ADA' && i.assetB.policyId)
  log('adaPools', topPools.length, adaPools.length)
  const filteredPools = adaPools.filter((i: any) => i.quantityA > 1e9) // ignore pools with less than 1000 ADA
  pools.push(...filteredPools)
  log('pools', pools.length)
  log('pool count', pools.length)
  return pools
}

async function getTokenPrices(timestamp: number) {

  const writes: Write[] = [];
  let pools = await getPools()
  const basePrice = await getTokenAndRedirectData(['cardano'], 'coingecko', timestamp)
  const cardanoPrice = basePrice[0].price
  addToDBWritesList(writes, chain, '0x0000000000000000000000000000000000000000', cardanoPrice, 6, 'ADA', timestamp, 'sundaeswap', 0.9)
  addToDBWritesList(writes, chain, 'lovelace', cardanoPrice, 6, 'ADA', timestamp, 'sundaeswap', 0.9)
  const priceLog: any[] = []
  pools.forEach(({  quantityA, quantityB, assetB: { assetId, policyId, decimals, ticker  } }: any) => {
    const token = policyId.toLowerCase()
    const symbol = ticker.replace(/ /g, '-').toUpperCase()
    const price = quantityA * (10 ** (decimals - 6)) / quantityB
    priceLog.push({ symbol, price: Number(cardanoPrice * price).toFixed(4), decimals, token })
    addToDBWritesList(writes, chain, token, cardanoPrice * price, decimals, symbol, timestamp, 'sundaeswap', 0.9)
    if (assetId && assetId.length)
      addToDBWritesList(writes, chain, assetId.replace('.', '').toLowerCase(), cardanoPrice * price, decimals, symbol, timestamp, 'sundaeswap', 0.9)
  })
  // console.table(priceLog)

  return writes
}
