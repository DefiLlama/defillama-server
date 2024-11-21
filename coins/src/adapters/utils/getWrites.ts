import {
  addToDBWritesList,
  getTokenAndRedirectDataMap
} from "./database";
import { getTokenInfo } from "./erc20";
import { Write, CoinData } from "./dbInterfaces";

function normalize(addr: string, chain?: string) {
  if (!addr || ['solana'].includes(chain as any)) return addr
  return addr.toLowerCase()
}

export default async function getWrites(params: { chain: string, timestamp: number, pricesObject: Object, writes?: Write[], projectName: string, underlyingChain?: string, confidence?: number}) {
  let { chain, timestamp, pricesObject, writes = [], underlyingChain, confidence } = params
  const entries = Object.entries(pricesObject).map(([token, obj]) => {
    return {
      token: normalize(token, chain),
      price: obj.price,
      underlying: normalize(obj.underlying, chain),
      symbol: obj.symbol ?? undefined,
      decimals: obj.decimals ?? undefined,
    }
  })

  const [
    tokenInfos,
    coinsData
  ] = await Promise.all([
    chain === 'solana' ? {} as any : getTokenInfo(underlyingChain ?? chain, entries.map(i => i.token), undefined),
    getTokenAndRedirectDataMap(entries.map(i => i.underlying).filter(i => i), underlyingChain ?? chain, timestamp)
  ])

  entries.map(({token, price, underlying, symbol, decimals }, i) => {
    const finalSymbol = symbol ?? tokenInfos.symbols[i].output
    const finalDecimals = decimals ?? tokenInfos.decimals[i].output
    let coinData: (CoinData | undefined) = coinsData[underlying]
    if (!underlying) coinData = {
      price: 1,
      confidence: 0.98,
    } as CoinData;
    if (!coinData) return;

    addToDBWritesList(writes, chain, token, coinData.price * price, finalDecimals, finalSymbol, timestamp, params.projectName, confidence ?? Math.min(0.98, coinData.confidence as number))
  })

  const writesObject: any = {}
  writes.forEach((i: any) => writesObject[i.symbol] = i.price)
  // sdk.log(chain, writesObject)
  return writes
}