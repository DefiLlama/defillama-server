import { log } from '@defillama/sdk'
import { Write, } from "../utils/dbInterfaces";
import { addToDBWritesList, getTokenAndRedirectData, } from "../utils/database";
import axios from 'axios'

export function wingriders(timestamp: number) {
  console.log("starting wingriders");
  return Promise.all([
    getTokenPrices(timestamp),
  ])
}
const chain = 'cardano'

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
  log('pools', Object.keys(exchangeRates).length)
  const { data } = await axios.post('https://explorer.mainnet.wingriders.com/api/tokens/metadata', { subjects: Object.keys(exchangeRates) })
  data.Right.forEach(({ subject, name, ticker, decimals, }: any) => {
    if (!name || !ticker || !decimals) return;
    metadatas[subject] = { name: name.value, ticker: ticker.value, decimals: decimals.value, price: exchangeRates[subject], token: subject, }
  })
  log('pool count', Object.keys(exchangeRates).length)
  return metadatas
}

async function getTokenPrices(timestamp: number) {

  const writes: Write[] = [];
  let pools = await getPools()
  const basePrice = await getTokenAndRedirectData(['cardano'], 'coingecko', timestamp)
  const cardanoPrice = basePrice[0].price
  addToDBWritesList(writes, chain, '0x0000000000000000000000000000000000000000', cardanoPrice, 6, 'ADA', timestamp, 'wingriders', 0.9)
  addToDBWritesList(writes, chain, 'lovelace', cardanoPrice, 6, 'ADA', timestamp, 'wingriders', 0.9)
  const priceLog: any[] = []
  Object.values(pools).forEach(({ token, price, decimals, ticker, name, }: any) => {
    token = token.toLowerCase()
    const symbol = (ticker || name).replace(/ /g, '-').toUpperCase()
    priceLog.push({ symbol, price, decimals, token })
    addToDBWritesList(writes, chain, token, cardanoPrice * price, decimals, symbol, timestamp, 'wingriders', 0.9)
  })
  // console.table(priceLog)

  return writes
}
