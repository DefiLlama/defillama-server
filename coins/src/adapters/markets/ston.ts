import { Write, } from "../utils/dbInterfaces";
import { addToDBWritesList, } from "../utils/database";
import axios from 'axios'
import { address } from "../../utils/ton";
import { graph } from "@defillama/sdk";

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

  function addToken({ id, symbol, decimals, price, hex }: { id: string, symbol: string, decimals: number, price: number, hex: string, }) {
    addToDBWritesList(writes, chain, hex, price, decimals, symbol, timestamp, 'ston', 0.9)
    addToDBWritesList(writes, chain, id, undefined, decimals, symbol, timestamp, 'ston', 0.9, `asset#ton:${hex}`)
  }

  return writes
}

const dedustQuery = `query GetAssets { 
   assets { type address name symbol decimals price }  
   pools { address type tradeFee assets reserves fees volume  } 
}`

async function getPoolData() {
  const { data: { pool_list } } = await axios.get('https://api.ston.fi/v1/pools')
  const { data: { asset_list } } = await axios.get('https://api.ston.fi/v1/assets')
  const whitelistedTokensSet: Set<String> = new Set()
  pool_list.forEach((pool: any) => {
    if (+pool.lp_total_supply_usd < 20_000) return; // ignore tokens in pools with less than 10k USD
    whitelistedTokensSet.add(pool.token0_address)
    whitelistedTokensSet.add(pool.token1_address)
  })
  const stonResponse = asset_list.filter((asset: any) => whitelistedTokensSet.has(asset.contract_address)).map((i: any) => ({
    id: address(i.contract_address).toString(),
    symbol: i.symbol,
    decimals: i.decimals,
    price: Number(i.dex_price_usd),
    hex: address(i.contract_address).toRawString(),
  }))


  // pull data from dedust 
  const dedustRes = await graph.request('https://api.dedust.io/v3/graphql', dedustQuery);
  whitelistedTokensSet.add('native') // how ton is represented in dedust
  const whitelistedDedustTokensSet: Set<String> = new Set()
  const priceMap: any = {}
  
  dedustRes.assets.forEach((asset: any) => {
    const token = (asset.type === 'jetton' ? 'jetton:' : '') + (asset.address || 'native')
    priceMap[token] = {
      decimals: asset.decimals,
      price: +asset.price,
    }
  })

  dedustRes.pools.forEach((pool: any) => {
    const pairedWithKnownToken = pool.assets.some((asset: any) => whitelistedTokensSet.has(asset.replace('jetton:', '')))
    let poolValueUSD = 0
    pool.reserves.forEach((reserve: any, i: number) => {
      if (+reserve === 0) return;
      const { price, decimals } = priceMap[pool.assets[i]] ?? {}
      if (!price) return;
      poolValueUSD +=  price * +reserve / (10 ** decimals)
    })

    if (!pairedWithKnownToken || poolValueUSD < 20_000) return; // ignore pools that are not paired with known tokens or have less than 20k USD in reserves
    pool.assets.filter((asset: any) => !whitelistedTokensSet.has(asset.replace('jetton:', ''))).forEach((asset: any) => whitelistedDedustTokensSet.add(asset.replace('jetton:', '')))
  })

  const dedustResponses = dedustRes.assets.filter((i: any) => i.address && whitelistedDedustTokensSet.has(i.address)).map((i: any) => ({
    id: address(i.address).toString(),
    symbol: i.symbol,
    decimals: i.decimals,
    price: Number(i.price),
    hex: address(i.address).toRawString(),
  }))


  return dedustResponses.concat(stonResponse)
}