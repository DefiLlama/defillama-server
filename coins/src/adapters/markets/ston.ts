import { Write, } from "../utils/dbInterfaces";
import { addToDBWritesList, } from "../utils/database";
import axios from 'axios'
import { address } from "../../utils/ton";

export function ston(timestamp: number) {

  const THIRY_MINUTES = 1800
  if (+timestamp !== 0 && timestamp < (+new Date() / 1e3 - THIRY_MINUTES))
    throw new Error("Can't fetch historical data")

  return Promise.all([
    getTokenPrices(timestamp),
  ])
}
const chain = 'ton'

async function getTokenPrices(timestamp: number) {

  const writes: Write[] = []
  const poolData: any = await getPoolData()
  poolData.map(addToken)

  function addToken({ id, symbol, decimals, price, hex }: { id: string, symbol: string, decimals: number, price: number, hex: string,}) {
    addToDBWritesList(writes, chain, hex, price, decimals, symbol, timestamp, 'ston', 0.9)
    addToDBWritesList(writes, chain, id, undefined, decimals, symbol, timestamp, 'ston', 1, `asset#ton:${hex}`)
  }

  return writes
}



async function getPoolData() {
  const { data: {pool_list}} = await axios.get('https://api.ston.fi/v1/pools')
  const { data: {asset_list}} = await axios.get('https://api.ston.fi/v1/assets')
  const whitelistedTokensSet: Set<String> = new Set()
  pool_list.forEach((pool: any) => {
    if (+pool.lp_total_supply_usd < 20_000) return; // ignore tokens in pools with less than 10k USD
    whitelistedTokensSet.add(pool.token0_address)
    whitelistedTokensSet.add(pool.token1_address)
  })
  return asset_list.filter((asset: any) => whitelistedTokensSet.has(asset.contract_address)).map((i: any) => ({
    id: address(i.contract_address).toString(),
    symbol: i.symbol,
    decimals: i.decimals,
    price: i.dex_price_usd,
    hex: address(i.contract_address).toRawString(),
  }))
}