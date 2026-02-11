import { Write, } from "../utils/dbInterfaces";
import { addToDBWritesList, } from "../utils/database";
import axios from 'axios'

export function valiant_dex(timestamp: number) {

  const THIRY_MINUTES = 1800
  if (+timestamp !== 0 && timestamp < (+new Date() / 1e3 - THIRY_MINUTES))
    throw new Error("Can't fetch historical data")

  return Promise.all([
    getTokenPrices(timestamp),
  ])
}
const chain = 'fogo'

async function getPools() {
  const { data: { pools } } = await axios.get(`https://mainnet-api.valiant.trade/dex/pools/paginated?page=1&limit=50`)
  console.log('pools', pools.length)
  const tokenData: any = {}
  pools.forEach((pool: any) => {
    const hasSafeTag = (i: any) => i?.tags?.some((tag: any) => tag === 'SAFE')
    if (!hasSafeTag(pool.token1) && !hasSafeTag(pool.token0)) return;
    if (pool.tvlUsd < 10000) return;
    if (pool.volume.volume24hUsd > 5000 || pool.volume.volume7dUsd > 5e4) return;
    if (pool.fees.fees24hUsd > 100 || pool.fees.fees7dUsd > 1000) return;
    if (!tokenData[pool.token1.address] || tokenData[pool.token1.address].tvlUsd < pool.tvlUsd) {
      pool.token1.tvlUsd = pool.tvlUsd
      tokenData[pool.token1.address] = pool.token1
    }

    if (!tokenData[pool.token0.address] || tokenData[pool.token0.address].tvlUsd < pool.tvlUsd) {
      pool.token0.tvlUsd = pool.tvlUsd
      tokenData[pool.token0.address] = pool.token0
    }
    console.log(pool)
  })
  return Object.values(tokenData)
}

async function getTokenPrices(timestamp: number) {

  const writes: Write[] = [];
  let pools = await getPools()
  pools.forEach(({ address, priceUsd: price, symbol, }: any) => {
    addToDBWritesList(writes, chain, address, price, 0, symbol, timestamp, 'valiant', 0.9)
  })

  return writes
}
