import { log } from '@defillama/sdk'
import { Write, } from "../utils/dbInterfaces";
import { addToDBWritesList, getTokenAndRedirectData, } from "../utils/database";
import axios from 'axios'

export function xexchange(timestamp: number) {
  console.log("starting xexchange");

  const THIRY_MINUTES = 1800
  if (+timestamp !== 0 && timestamp < (+new Date() / 1e3 - THIRY_MINUTES))
    throw new Error("Can't fetch historical data")

  return Promise.all([
    getTokenPrices(timestamp),
  ])
}
const chain = 'elrond'

const ashTokens: any = {
  'SEGLD-3ad2d0': { ticker: 'SEGLD', decimals: 18 },
  'HSEGLD-c13a4e': { ticker: 'HSEGLD', decimals: 8 },
}

async function getAshPools() {
  const prices: any = {}
  const { data: { data: { tokens } } } = await axios.post('https://api-v2.ashswap.io/graphql', {
    "query": `{  tokens {    id    price  }}`,
    "operationName": null,
    variables: {},
  })
  for (const token of tokens) {
    if (ashTokens[token.id]) {
      prices[token.id] = { ...ashTokens[token.id], price: token.price, identifier: token.id }
    }
  }

  return prices
}

async function getPools(prices: any) {
  const { data: { data: { pairs } } } = await axios.post('https://graph.xexchange.com/graphql', {
    "query": `{ 
      pairs (limit: 1000) {
        address
        firstToken {identifier name ticker decimals price }
        secondToken {identifier name ticker decimals price }
        lockedValueUSD
        liquidityPoolToken {identifier name ticker decimals price }
        liquidityPoolTokenPriceUSD
      }
    }`,
    "operationName": null,
    variables: {},
  })
  const filteredPools = pairs.filter((i: any) => +i.lockedValueUSD > 2000) // ignore pools with less than 2000$ in liquidity
  log('pools', filteredPools.length, pairs.length)
  const poolIds = filteredPools.map(({liquidityPoolToken: { identifier}}: any) => identifier)
  const { data: lpData } =await axios.get(`https://api.multiversx.com/tokens?identifiers=${poolIds.join(',')}`)
  const lpInfo : any  = {}
  lpData.forEach((i: any) => lpInfo[i.identifier] = i) 
  filteredPools.forEach(({ firstToken, secondToken, liquidityPoolToken, lockedValueUSD, }: any) => {
    prices[firstToken.identifier] = firstToken
    prices[secondToken.identifier] = secondToken
    const lpDatum = lpInfo[liquidityPoolToken.identifier]
    if (lpDatum) {
      liquidityPoolToken.price = +lockedValueUSD * (10 ** liquidityPoolToken.decimals) / +lpDatum.supply
      console.log(lockedValueUSD, lpDatum.supply, liquidityPoolToken.decimals, liquidityPoolToken.identifier, liquidityPoolToken.price)
      prices[liquidityPoolToken.identifier] = liquidityPoolToken
    }
  })
}

async function getTokenPrices(timestamp: number) {

  const prices: any = await getAshPools()
  const writes: Write[] = [];
  await getPools(prices)
  const priceLog: any[] = []
  Object.values(prices).forEach((i: any) => addToken(i))

  // console.table(priceLog)
  function addToken({ identifier, ticker, decimals, price, name, }: { identifier: string, name: string, ticker: string, decimals: number, price: string, }) {
    addToDBWritesList(writes, chain, identifier, +price, decimals, ticker, timestamp, 'xexchange', 0.9)
    priceLog.push({ name, symbol: ticker, price, decimals, token: identifier })
  }
  return writes
}
