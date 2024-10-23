import axios from 'axios'
import { addToDBWritesList, getTokenAndRedirectData, } from "../utils/database";
import { Write, } from "../utils/dbInterfaces";
import { log } from '@defillama/sdk'

const chain = 'btr'
export function macaron(timestamp: number) {

  const THIRY_MINUTES = 1800
  if (+timestamp !== 0 && timestamp < (+new Date() / 1e3 - THIRY_MINUTES))
    throw new Error("Can't fetch historical data")

  return Promise.all([
    getTokenPrices(timestamp),
  ])
}

async function getTokenPrices(timestamp: number) {
  const writes: Write[] = [];
  const res = await axios.get('https://macaromswap.github.io/lp/pools.json')
  const pools = Object.keys(res.data)
  pools.forEach((pool: any) => {
    if(res.data[pool].network == 'MAIN') {
      addToDBWritesList(
        writes,
        chain,
        pool,
        res.data[pool].price,
        18,
        res.data[pool].symbol,
        timestamp,
        "macaron",
        0.9,
      );
    }
  })
  return writes;
}
