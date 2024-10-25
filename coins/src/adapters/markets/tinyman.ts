import { Write, } from "../utils/dbInterfaces";
import { addToDBWritesList, } from "../utils/database";
import axios from 'axios'

export function tinyman(timestamp: number) {

  const THIRY_MINUTES = 1800
  if (+timestamp !== 0 && timestamp < (+new Date() / 1e3 - THIRY_MINUTES))
    throw new Error("Can't fetch historical data")

  return Promise.all([
    getTokenPrices(timestamp),
  ])
}
const chain = 'algorand'

async function getTokenPrices(timestamp: number) {

  const prices: any = {}
  const writes: Write[] = []
  const priceLog: any[] = []
  const poolData: any = await getPoolData()
  let algoPrice: number

  poolData.forEach(({ asset_1, asset_2, liquidity_asset }: any) => {
    const assets = [asset_1, asset_2, liquidity_asset]
    assets.forEach((asset: any) => {
      const { id, usd_reserves, is_liquidity_token } = asset
      if (is_liquidity_token && usd_reserves < 50_000) return;
      if (id === '0') {
        if (!algoPrice) algoPrice = asset.price
        return;
      }
      if (!prices[id]) {
        prices[id] = asset
        return;
      }

      if (prices[id].usd_reserves < usd_reserves)
        prices[id] = asset

    })
  })
  Object.values(prices).forEach((i: any) => addToken(i))

  // console.table(priceLog)
  function addToken({ id, symbol, decimals, price, name, }: { id: string, name: string, symbol: string, decimals: number, price: number, }) {
    addToDBWritesList(writes, chain, id, price, decimals, symbol, timestamp, 'tinyman', 0.9)
    priceLog.push({ name, symbol, price, decimals, token: id })
  }

  await addMAlgo()
  return writes

  async function addMAlgo() {
    try {
      const { data: { algo } } = await axios.get('https://messina.one/api/ls/exchange-rate')

      addToDBWritesList(writes, chain, '1185173782', algo * algoPrice, 6, 'mALGO', timestamp, 'messina', 0.9)
    } catch (e) {
      console.error(e)
    }
  }
}



async function getPoolData() {
  // we pull the top 2000 pools
  let { data: { results, next } } = await axios.get('https://mainnet.analytics.tinyman.org/api/v1/pools/?limit=999&version__in=1.1%2C2.0&with_statistics=true&ordering=-liquidity')
  if (next) {
    const { data: { results: results2 } } = await axios.get(next)
    results = results.concat(results2)
  }

  return results.filter((pool: any) => {
    const { asset_1, asset_2, current_asset_1_reserves_in_usd, current_asset_2_reserves_in_usd, liquidity_in_usd, current_asset_1_reserves, current_asset_2_reserves, liquidity_asset } = pool

    if (+liquidity_in_usd < 20_000) return false
    if (!asset_1.is_verified && !asset_2.is_verified) return false
    if (asset_1.is_verified && +current_asset_1_reserves_in_usd < 5_000) return false
    if (asset_2.is_verified && +current_asset_2_reserves_in_usd < 5_000) return false

    asset_1.price = current_asset_1_reserves_in_usd / (current_asset_1_reserves / 10 ** asset_1.decimals)
    asset_2.price = current_asset_2_reserves_in_usd / (current_asset_2_reserves / 10 ** asset_2.decimals)
    liquidity_asset.price = liquidity_in_usd / (liquidity_asset.total_amount / 10 ** liquidity_asset.decimals)
    asset_1.symbol = asset_1.unit_name
    asset_2.symbol = asset_2.unit_name
    liquidity_asset.symbol = liquidity_asset.name.replace('TinymanPool', 'TP').replaceAll(' ', '-')
    asset_1.usd_reserves = +current_asset_1_reserves_in_usd
    asset_2.usd_reserves = +current_asset_2_reserves_in_usd
    liquidity_asset.usd_reserves = +liquidity_in_usd
    return true
  })
}