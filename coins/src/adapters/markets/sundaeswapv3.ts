import { log } from '@defillama/sdk'
import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";
import axios from 'axios';
import { Write, } from "../utils/dbInterfaces";
const chain = 'cardano'

export function sundaeswapV3(timestamp: number) {

  const THIRY_MINUTES = 1800
  if (+timestamp !== 0 && timestamp < (+new Date() / 1e3 - THIRY_MINUTES))
    throw new Error("Can't fetch historical data")

  return Promise.all([
    getTokenPrices(timestamp),
  ])
}

async function getPools() {
  const pools = [];
  const response = await axios.post('https://api.sundae.fi/graphql', {
    query: `query getPopularPools { 
        pools { 
          popular { 
            assetA { 
              id 
              policyId 
              decimals 
              ticker 
            } 
            assetB { 
              id 
              policyId 
              decimals 
              ticker 
            } 
          } 
        } 
      }`,
    operationName: "getPopularPools"
  })
  const topPools = response.data.data?.pools?.popular
  const adaPools = topPools.filter((i: any) => !i.assetA.assetName && i.assetA.ticker === 'ADA' && i.assetB.policyId)
  const filteredPools = adaPools.filter((i: any) => !i.assetA.assetName && i.assetA.ticker === 'ADA' && i.assetB.policyId);
  log('adaPools', topPools.length, adaPools.length)
  pools.push(...filteredPools)
  log('pools', pools.length)
  log('pool count', pools.length)
  return pools;
}

async function getTokenPrices(timestamp: number) {
  const writes: Write[] = [];
  let pools = await getPools()
  const [basePrice] = await getTokenAndRedirectData(['cardano'], 'coingecko', timestamp)
  const cardanoPrice = basePrice.price
  addToDBWritesList(writes, chain, '0x0000000000000000000000000000000000000000', cardanoPrice, 6, 'ADA', timestamp, 'sundaeswap', 0.9)
  addToDBWritesList(writes, chain, 'lovelace', cardanoPrice, 6, 'ADA', timestamp, 'sundaeswap', 0.9)
  const priceLog: any[] = []
  pools.forEach(({ quantityA, quantityB, assetB: { assetId, policyId, decimals, ticker } }: any) => {
    const token = policyId.toLowerCase()
    const symbol = ticker.replace(/ /g, '-').toUpperCase()
    const price = quantityA * (10 ** (decimals - 6)) / quantityB
    priceLog.push({ symbol, price: Number(cardanoPrice * price).toFixed(4), decimals, token })
    addToDBWritesList(writes, chain, token, cardanoPrice * price, decimals, symbol, timestamp, 'sundaeswap', 0.9)
    if (assetId && assetId.length)
      addToDBWritesList(writes, chain, assetId.replace('.', '').toLowerCase(), cardanoPrice * price, decimals, symbol, timestamp, 'sundaeswap', 0.9)
  })
  return writes
}
