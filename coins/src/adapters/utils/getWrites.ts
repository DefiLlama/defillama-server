import {
  addToDBWritesList,
  getTokenAndRedirectData
} from "./database";
import { getTokenInfo } from "./erc20";
import { Write, CoinData } from "./dbInterfaces";

export default async function getWrites(params: { chain: string, timestamp: number, pricesObject: Object, writes?: Write[], projectName: string}) {
  let { chain, timestamp, pricesObject, writes = [] } = params
  const entries = Object.entries(pricesObject).map(([token, obj]) => {
    return {
      token: token.toLowerCase(),
      price: obj.price,
      underlying: obj.underlying.toLowerCase(),
    }
  })

  const [
    tokenInfos,
    coinsData
  ] = await Promise.all([
    getTokenInfo(chain, entries.map(i => i.token), undefined),
    getTokenAndRedirectData(entries.map(i => i.underlying), chain, timestamp)
  ])

  entries.map(({token, price, underlying, }, i) => {
    const coinData: (CoinData | undefined) = coinsData.find(
      (c: CoinData) => c.address.toLowerCase() === underlying
    );
    if (!coinData) return;

    addToDBWritesList(writes, chain, token, price, tokenInfos.decimals[i].output, tokenInfos.symbols[i].output, timestamp, params.projectName, coinData.confidence as number)
  })

  return writes
}