import { Write, } from "../utils/dbInterfaces";
import { addToDBWritesList, } from "../utils/database";
import axios from "axios";
import { getCache } from '../../utils/cache';


export function alex(timestamp: number) {
  return Promise.all([
    getTokenPrices(timestamp),
  ])
}
const chain = 'stacks'

async function getTokenPrices(timestamp: number) {
  const writes: Write[] = [];
  const cache = await getCache('alex/ammv2', 'stacks', { useTvlCache: true })
  const { data: { data } } = await axios.get('https://api.alexgo.io/v2/public/token-prices')
  const priceMap: Record<string, number> = {}
  data.forEach((d: any) => {
    priceMap[d.contract_id] = d.last_price_usd
  })

  const tokenMetadata = cache.tokenMetadata ?? {}
  Object.entries(tokenMetadata).forEach(([token, { decimals, symbol, baseToken, baseDecimals, baseSymbol }]: any) => {
    const price = priceMap[token] ?? priceMap[baseToken]
    if (!price) return;
    if (baseToken) {
      addToDBWritesList(writes, chain, baseToken, price, baseDecimals, baseSymbol, timestamp, 'alex', 0.9)
      addToDBWritesList(writes, chain, token, undefined, decimals, symbol, timestamp, 'alex', 0.9, 'stacks:' + baseToken)
    } else
      addToDBWritesList(writes, chain, token, price, decimals, symbol, timestamp, 'alex', 0.9)
  })

  return writes
}
