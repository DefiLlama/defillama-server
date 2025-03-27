import { Write, } from "../utils/dbInterfaces";
import { addToDBWritesList, } from "../utils/database";
import axios from 'axios'

export function balanced(timestamp: number) {

  const THIRY_MINUTES = 1800
  if (+timestamp !== 0 && timestamp < (+new Date() / 1e3 - THIRY_MINUTES))
    throw new Error("Can't fetch historical data")

  return Promise.all([
    getTokenPrices(timestamp),
  ])
}
const chain = 'icon'

async function getTokenPrices(timestamp: number) {
  const writes: Write[] = []
  const poolData: any = await getPoolData()
  poolData.forEach((i: any) => addToken(i))

  function addToken({ id, symbol, decimals, price, }: { id: string, name: string, symbol: string, decimals: number, price: number, }) {
    addToDBWritesList(writes, chain, id, price, decimals, symbol, timestamp, 'balanced', 0.9)
  }

  return writes
}

async function getPoolData() {
  let { data: pools } = await axios.get('https://balanced.icon.community/api/v1/pools')
  const data: any = {}

  pools.filter((pool: any) => {
    const {base_volume_30d, base_symbol, base_address, base_price, base_decimals, base_liquidity, 
      quote_volume_30d, quote_symbol, quote_address, quote_price, quote_decimals, quote_liquidity, } = pool
    if (base_volume_30d > 5000 && base_liquidity > 2000 && (!data[base_address] || data[base_address].liquidity < base_liquidity)) 
      data[base_address] = {
        id: base_address,
        symbol: base_symbol,
        price: base_price,
        decimals: base_decimals,
        liquidity: base_liquidity,
      }

    if (quote_volume_30d > 5000 && quote_liquidity > 2000 && (!data[quote_address] || data[quote_address].liquidity < quote_liquidity))
      data[quote_address] = {
        id: quote_address,
        symbol: quote_symbol,
        price: quote_price,
        decimals: quote_decimals,
        liquidity: quote_liquidity,
      }
  })
  return Object.values(data)
}