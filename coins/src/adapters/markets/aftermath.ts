import { Write, } from "../utils/dbInterfaces";
import { addToDBWritesList, } from "../utils/database";
import axios from 'axios'
import { sliceIntoChunks } from "@defillama/sdk/build/util";

export function aftermath(timestamp: number) {

  const THIRY_MINUTES = 1800
  if (+timestamp !== 0 && timestamp < (+new Date() / 1e3 - THIRY_MINUTES))
    throw new Error("Can't fetch historical data")

  return Promise.all([
    getTokenPrices(timestamp),
  ])
}
const chain = 'sui'

async function getTokenPrices(timestamp: number) {
  const writes: Write[] = [];
  const { data: pools } = await axios.post('https://aftermath.finance/api/pools', {})
  const poolChunks = sliceIntoChunks(pools, 42)
  const tokenSet = new Set()
  let i = 0
  for (const chunk of poolChunks) {
    const { data: result } = await axios.post('https://aftermath.finance/api/pools/stats', { poolIds: chunk.map((i: any) => i.objectId) })
    result.forEach((data: any, idx: any) => {
      if (data.tvl < 10_000 || data.volume < 1000) return;
      const pool = pools[idx]
      Object.keys(pool.coins).forEach((i: any) => tokenSet.add(i))
      if (data.tvl > 20_000 && data.volume > 2000) {
        addToDBWritesList(writes, chain, pool.lpCoinType, data.lpPrice, pool.lpCoinDecimals, 'AF_LP-' + pool.name.replace(/ /g, '-'), timestamp, 'aftermath', 0.9)
      }
    })
  }
  const tokens = Array.from(tokenSet)
  const tokenChunks = sliceIntoChunks(tokens, 10)
  console.log('Token chunks', tokens.length)
  for (const chunk of tokenChunks) {
    const { data: coinPrices } = await axios.post('https://aftermath.finance/api/price-info', { coins: chunk })
    const { data: coinMetadata } = await axios.post('https://aftermath.finance/api/coins/metadata', { coins: chunk })

    chunk.forEach((token: string, i: any) => {

      const price = coinPrices[token]?.price

      if (!price || !coinMetadata[i] || price < 0) return;
      const { decimals, symbol } = coinMetadata[i]
      addToDBWritesList(writes, chain, token, price, decimals, symbol, timestamp, 'aftermath', 0.9)
    })
  }
  return writes
}
