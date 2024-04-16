import { log } from '@defillama/sdk'
import { Write, } from "../utils/dbInterfaces";
import { addToDBWritesList, getTokenAndRedirectData, } from "../utils/database";
import axios, { AxiosInstance } from 'axios'
import { getCache, setCache } from '../../utils/cache';

export function wingriders(timestamp: number) {
  return Promise.all([
    getTokenPrices(timestamp),
  ])
}
const chain = 'cardano'

const api: AxiosInstance = axios.create({
  baseURL: "https://cardano-mainnet.blockfrost.io/api/v0",
  headers: {
    project_id: 'mai' + 'nnetcxT8VaeCgVMzMTSe' + 'zZijWlVkyh6XytpS',
    "Content-Type": "application/json",
  },
  timeout: 300000,
})


async function getMetadata(tokens: string[]) {
  const cache = await getCache('wingriders-metadata', 'cardano')
  let cacheUpdated = false
  for (const token of tokens) {
    if (!cache[token]) {
      try {
        const { data } = await api.get(`assets/${token}`)
        if (!data) continue;
        const { metadata, asset, policy_id, onchain_metadata_standard, onchain_metadata } = data
        let { name, ticker, decimals } = metadata ?? {}
        if (!metadata) {
          if (!onchain_metadata)
            throw new Error('no metadata')
          name = onchain_metadata.name
          ticker = onchain_metadata.ticker ?? onchain_metadata.symbol ?? name
          decimals = 0
        }
        cache[token] = { name, ticker, decimals, policy_id, metadataStandard: onchain_metadata_standard }
        cacheUpdated = true
      } catch (e) {
        console.error('wingriders: error fetching token data', token, (e as any).toString())
        continue
      }
    }

  }
  if (cacheUpdated) 
    await setCache('wingriders-metadata', 'cardano', cache)
  return cache
}

async function getPools() {
  const exchangeRates: any = {}
  const metadatas: any = {}
  const whitelistedTokens: any = {}
  const { data: [
    { data: { poolsWithMarketdata } },
    { data: { assetsAdaExchangeRates } },
  ] } = await axios.post('https://api.mainnet.wingriders.com/graphql', [{ "operationName": "LiquidityPoolsWithMarketData", "variables": { "input": { "sort": true } }, "query": "query LiquidityPoolsWithMarketData($input: PoolsWithMarketdataInput) {\n  poolsWithMarketdata(input: $input) {\n    ...LiquidityPoolFragment\n    __typename\n  }\n}\n\nfragment LiquidityPoolFragment on PoolWithMarketdata {\n  poolType\n  tvlInAda\n tokenA {\n   policyId\n    assetName\n    quantity\n    __typename\n  }\n  tokenB {\n    policyId\n    assetName\n    quantity\n    __typename\n  }\n  treasuryA\n  treasuryB\n }" }, { "operationName": "AssetsAdaExchangeRates", "variables": {}, "query": "query AssetsAdaExchangeRates {\n  assetsAdaExchangeRates {\n    ...AssetExchangeRateFragment\n    __typename\n  }\n}\n\nfragment AssetExchangeRateFragment on AssetExchangeRate {\n  assetId\n  baseAssetId\n  exchangeRate\n __typename\n}" }])
  poolsWithMarketdata.forEach((pool: any) => {
    const { tokenA, tokenB, } = pool
    const { policyId: policyIdA, assetName: assetNameA, quantity: quantityA } = tokenA
    const { policyId: policyIdB, assetName: assetNameB, } = tokenB
    const assetA = `${policyIdA}${assetNameA}`
    const assetB = `${policyIdB}${assetNameB}`
    if (assetA === '' && +quantityA > 1e9) whitelistedTokens[assetB] = true
  })
  assetsAdaExchangeRates.forEach((asset: any) => {
    const { assetId, baseAssetId, exchangeRate } = asset
    if (baseAssetId !== '' || !whitelistedTokens[assetId]) return;
    exchangeRates[assetId] = exchangeRate
  })
  const data: any = await getMetadata(Object.keys(exchangeRates))
  Object.entries(data).forEach(([token, { name, ticker, decimals, }]: any) => {
    metadatas[token] = { name, ticker, decimals, price: (exchangeRates as any)[token], token, }
  })
  return metadatas
}

async function getTokenPrices(timestamp: number) {

  const writes: Write[] = [];
  let pools = await getPools()
  const basePrice = await getTokenAndRedirectData(['cardano'], 'coingecko', timestamp)
  const cardanoPrice = basePrice[0].price
  addToDBWritesList(writes, chain, '0x0000000000000000000000000000000000000000', cardanoPrice, 6, 'ADA', timestamp, 'wingriders', 0.9)
  addToDBWritesList(writes, chain, 'lovelace', cardanoPrice, 6, 'ADA', timestamp, 'wingriders', 0.9)
  Object.values(pools).forEach(({ token, price, decimals, ticker, name, }: any) => {
    token = token.toLowerCase()
    const symbol = (ticker || name).replace(/ /g, '-').toUpperCase()
    addToDBWritesList(writes, chain, token, cardanoPrice * price, decimals, symbol, timestamp, 'wingriders', 0.9)
  })

  return writes
}
