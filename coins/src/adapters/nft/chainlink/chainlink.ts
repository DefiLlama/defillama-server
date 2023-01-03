import { Write, } from "../../utils/dbInterfaces";
import { addToDBWritesList, getTokenAndRedirectData } from "../../utils/database";
import pricefeeds from "./priceFeeds";
import * as sdk from '@defillama/sdk'

export default async function getTokenPrices(chain: string, timestamp: number) {
  const api = new sdk.ChainApi({ chain })
  if (timestamp !== 0) {
    api.timestamp = timestamp
    await api.getBlock()
  }
  const data: any = (pricefeeds as any)[chain]
  const writes: Write[] = [];
  await Promise.all(data.map(_getWrites))

  return writes

  async function _getWrites(info: any) {
    const { underlying, nfts } = info
    const tokens = nfts.map((i: any) => i.token)
    const oracles = nfts.map((i: any) => i.oracle)
    const prices = await api.multiCall({ abi: "int256:latestAnswer", calls: oracles })
    // const names = await api.multiCall({ abi: "string:name", calls: tokens })
    const symbols = await api.multiCall({ abi: "string:symbol", calls: tokens })
    const [coinData] = await getTokenAndRedirectData([underlying], chain, timestamp)
    if (!coinData) return;
    
    prices.forEach((price, i) => {
      addToDBWritesList(writes, chain, tokens[i], coinData.price * price / (10 ** coinData.decimals), 0, symbols[i], timestamp, 'chainlink-nft', coinData.confidence as number)
    })
  }
}
