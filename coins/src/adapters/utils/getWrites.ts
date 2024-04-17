import {
  addToDBWritesList,
  getTokenAndRedirectData
} from "./database";
import { getTokenInfo } from "./erc20";
import { Write, CoinData } from "./dbInterfaces";
import * as sdk from '@defillama/sdk'

export default async function getWrites(params: { chain: string, timestamp: number, pricesObject: Object, writes?: Write[], projectName: string}) {
  let { chain, timestamp, pricesObject, writes = [] } = params
  const entries = Object.entries(pricesObject).map(([token, obj]) => {
    return {
      token: token.toLowerCase(),
      price: obj.price,
      underlying: obj.underlying?.toLowerCase(),
      symbol: obj.symbol ?? undefined,
      decimals: obj.decimals ?? undefined,
    }
  })

  const [
    tokenInfos,
    coinsData
  ] = await Promise.all([
    getTokenInfo(chain, entries.map(i => i.token), undefined),
    getTokenAndRedirectData(entries.map(i => i.underlying).filter(i => i), chain, timestamp)
  ])

  entries.map(({token, price, underlying, symbol, decimals }, i) => {
    const finalSymbol = symbol ?? tokenInfos.symbols[i].output
    const finalDecimals = decimals ?? tokenInfos.decimals[i].output
    let coinData: (CoinData | undefined) = coinsData.find(
      (c: CoinData) => c.address.toLowerCase() === underlying
    );
    if (!underlying) coinData = {
      price: 1,
      confidence: 1,
    } as CoinData;
    if (!coinData) return;

    addToDBWritesList(writes, chain, token, coinData.price * price, finalDecimals, finalSymbol, timestamp, params.projectName, coinData.confidence as number)
  })

  const writesObject: any = {}
  writes.forEach((i: any) => writesObject[i.symbol] = i.price)
  // sdk.log(chain, writesObject)
  return writes
}