import { getCache, setCache } from "../../utils/cache";
import sleep from "../../utils/shared/sleep";
import { fetch, } from "../utils"

export default async function bridge() {
  const coins = (
    await fetch("https://api.coingecko.com/api/v3/coins/list?include_platform=true")
  ) as any[];

  const ordinalMappings: any = {}
  coins.forEach((coin) => {
    const ordId = coin.platforms?.ordinals
    if (!ordId) return;
    ordinalMappings[ordId] = coin
  })

  const ordTickerMapping = await getCache('bridge', 'brc20')
  const missingMappings = Object.keys(ordinalMappings).filter(ordId => !ordTickerMapping[ordId])

  for (const id of missingMappings) {
    const token = await fetch(`https://open-api.unisat.io/v1/indexer/inscription/content/${id}`, {
      headers: {
        'Authorization': process.env.UNISAT_AUTH
      }
    });
    if (!token?.tick) continue;
    ordTickerMapping[id] = token.tick
    await sleep(2500)
  }

  if (missingMappings.length) await setCache('bridge', 'brc20', ordTickerMapping)

  const response: any = []
  Object.entries(ordinalMappings).forEach(([ordId, coinData]: any) => {
    const to = `coingecko#${coinData.id}`
    const symbol = coinData.symbol + '[BRC-20]'
    const decimals = 0
    response.push({ from: `bitcoin:${ordId}`, to, symbol, decimals })
    if (ordTickerMapping[ordId]) response.push({ from: `bitcoin:${ordTickerMapping[ordId]}`, to, symbol, decimals })
  })
  return response
}
