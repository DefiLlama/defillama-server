import { log } from '@defillama/sdk'
import { Write, } from "../utils/dbInterfaces";
import { addToDBWritesList, } from "../utils/database";
import axios from 'axios'

export function ociswap(timestamp: number) {
  console.log("starting ociswap");
  
  const THIRY_MINUTES = 1800
  if (+timestamp !== 0 && timestamp < (+new Date() / 1e3 - THIRY_MINUTES))
    throw new Error("Can't fetch historical data")

  return Promise.all([
    getTokenPrices(timestamp),
  ])
}
const chain = 'radixdlt'

async function getPools() {
  const pools = []
  let cursor = 0
  do {
    const { data: { data, next_cursor } } = await axios.get(`https://api.ociswap.com/tokens?cursor=${cursor}&limit=100&order=rank&min_liquidity_usd=2000`)
    cursor = next_cursor
    pools.push(...data)
  } while (cursor > 0)
  log('pools', pools.length)
  return pools
}

async function getTokenPrices(timestamp: number) {

  const writes: Write[] = [];
  let pools = await getPools()
  pools.forEach(({  address, price, symbol, }: any) => {
    price = price.usd['1h']
    addToDBWritesList(writes, chain, address, price, 0, symbol, timestamp, 'ociswap', 0.9)
  })
  return writes
}
