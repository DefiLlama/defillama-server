import { Write, } from "../utils/dbInterfaces";
import { addToDBWritesList, } from "../utils/database";
import axios from 'axios'

export function cetus(timestamp: number) {

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
  const { data: { data: { list } } } = await axios.get('https://api-sui.cetus.zone/v2/sui/coins_info')
  const { data: { data: { tokens } } } = await axios.get('https://api-sui.cetus.zone/v2/sui/swap/count/v3')
  const coinInfos: any = {}
  list.forEach((i: any) => coinInfos[i.coin_type] = i)
  tokens.forEach((i: any) => {
    if (+i.pure_tvl_in_usd < 5_000 || +i.vol_in_usd_24h < 1000) return;
    const coinInfo = coinInfos[i.address]
    if (!coinInfo) {
      console.log('Metadata not found: ', i.address)
      return;
    }

    if (coinInfo.coingecko_id)
      addToDBWritesList(writes, chain, i.address, undefined, coinInfo.decimals, i.symbol, timestamp, 'cetus', 0.9, 'coingecko#' + coinInfo.coingecko_id)
    else
      addToDBWritesList(writes, chain, i.address, i.price, coinInfo.decimals, i.symbol, timestamp, 'cetus', 0.9)
  })
  return writes
}
