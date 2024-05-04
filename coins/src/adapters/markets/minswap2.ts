import { log } from '@defillama/sdk'
import { Write, } from "../utils/dbInterfaces";
import { addToDBWritesList, getTokenAndRedirectData, } from "../utils/database";
import axios, { AxiosInstance } from "axios";
import { getCache, setCache } from '../../utils/cache';

const api: AxiosInstance = axios.create({
  baseURL: "https://cardano-mainnet.blockfrost.io/api/v0",
  headers: {
    project_id: 'mai' + 'nnetcxT8VaeCgVMzMTSe' + 'zZijWlVkyh6XytpS',
    "Content-Type": "application/json",
  },
  timeout: 300000,
})

export function minswap(timestamp: number) {
  return Promise.all([
    getTokenPrices(timestamp),
  ])
}
const chain = 'cardano'

async function getPools() {
  const { data } = await axios.get('https://api-mainnet-prod.minswap.org/defillama/all-pairs', {
    headers: {
      Authorization: process.env.MINSWAP_API_KEY
    }
  })
  let pools = data.filter((i: any) => i.asset_a === 'lovelace' && i.reserve_a > 1e9) // ignore pools with less than 1000 ADA
  log('pool count', data.length, pools.length)
  const cache = await getCache('minswap-metadata', 'cardano')
  let cacheUpdated = false
  const response = []
  for (const pool of pools) {
    const token = pool.asset_b.replace(/\./g, '')
    if (!cache[token]) {
      try {
        const { data } = await api.get(`assets/${token}`)
        if (!data) continue;
        const { metadata, asset, policy_id, onchain_metadata_standard, onchain_metadata } = data
        let { name, ticker, decimals } = metadata ?? {}
        if (!metadata) {
          if (!onchain_metadata)
            throw new Error('no metadata')
          name = onchain_metadata.name
          ticker = onchain_metadata.ticker ?? onchain_metadata.symbol ?? name
          decimals = 0
        }
        cache[token] = { name, ticker, decimals, policy_id, metadataStandard: onchain_metadata_standard }
        cacheUpdated = true
      } catch (e) {
        console.error('minswap: error fetching token data', token, (e as any).toString())
        pool.token = token
        pool.ticker = 'unknown'
        pool.decimals = 0
        response.push(pool)
        continue
      }
    }

    response.push({ ...pool, ...cache[token], token, decimals: cache[token].decimals ?? 0 })
  }
  if (cacheUpdated) {
    await setCache('minswap-metadata', 'cardano', cache)
  }
  return response
}

async function getTokenPrices(timestamp: number) {

  const writes: Write[] = [];
  let pools = await getPools()
  const basePrice = await getTokenAndRedirectData(['cardano'], 'coingecko', timestamp)
  const cardanoPrice = basePrice[0].price
  addToDBWritesList(writes, chain, '0x0000000000000000000000000000000000000000', cardanoPrice, 6, 'ADA', timestamp, 'minswap', 0.9)
  addToDBWritesList(writes, chain, 'lovelace', cardanoPrice, 6, 'ADA', timestamp, 'minswap', 0.9)
  const priceLog: any[] = []
  pools.forEach(({ token, name, ticker, decimals, reserve_a, reserve_b, policy_id }: any) => {
    const symbol = (ticker || name).replace(/ /g, '-').toUpperCase()
    const price = reserve_a * (10 ** (decimals - 6)) / reserve_b
    priceLog.push({ symbol, price: Number(cardanoPrice * price).toFixed(4), decimals, token })
    addToDBWritesList(writes, chain, token, cardanoPrice * price, decimals, symbol, timestamp, 'minswap', 0.9)
    if (policy_id)
      addToDBWritesList(writes, chain, policy_id, cardanoPrice * price, decimals, symbol, timestamp, 'minswap', 0.9)
  })
  // console.table(priceLog)

  return writes
}
