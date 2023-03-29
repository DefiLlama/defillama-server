
import { Write, } from "../utils/dbInterfaces";
import { addToDBWritesList, getTokenAndRedirectData, } from "../utils/database";
import { getCache, setCache, } from "../../utils/cache";
import fetch from "node-fetch";
import { PromisePool } from '@supercharge/promise-pool'

export function minswap(timestamp: number) {
  console.log("starting minswap");
  return Promise.all([
    getTokenPrices(timestamp),
  ])
}
const chain = 'cardano'

async function getTokenPrices(timestamp: number) {

  const writes: Write[] = [];
  let pools = await fetch('https://api-mainnet-prod.minswap.org/coinmarketcap/v2/pairs').then(r => r.json())
  pools = Object.values(pools).filter((i: any) => {
    return i.quote_id === 'lovelace' && +i.quote_volume > 10
  })
  const ids = pools.map((i: any) => i.base_id.toLowerCase())
  const decimals = await getDecimals(ids)
  const basePrice = await getTokenAndRedirectData(['cardano'], 'coingecko', timestamp)
  const cardanoPrice = basePrice[0].price
  addToDBWritesList(writes, chain, '0x0000000000000000000000000000000000000000', cardanoPrice, 6, 'ADA', timestamp, 'minswap', 0.9)
  addToDBWritesList(writes, chain, 'lovelace', cardanoPrice, 6, 'ADA', timestamp, 'minswap', 0.9)
  const priceLog: any[] = []
  pools.forEach(({ base_id, base_symbol = '', last_price, base_name = '' }: any) => {
    const token = base_id.toLowerCase()
    const decimal = decimals[token]
    if (typeof decimal !== 'number') {
      // console.log('Missing decimals for: ', base_id)
      return;
    }
    const symbol = (base_symbol.length > 1 ? base_symbol : (base_name.length > 1 ? base_name : base_id)).replace(/ /g, '-').toUpperCase()
    priceLog.push({ symbol, price: Number(cardanoPrice * last_price).toFixed(4),  decimal})
    addToDBWritesList(writes, chain, token, cardanoPrice * last_price, decimal, symbol, timestamp, 'minswap', 0.9)
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


