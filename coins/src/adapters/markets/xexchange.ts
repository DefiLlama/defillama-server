import { log } from '@defillama/sdk'
import { Write, } from "../utils/dbInterfaces";
import { addToDBWritesList, } from "../utils/database";
import axios from 'axios'

export function xexchange(timestamp: number) {

  const THIRY_MINUTES = 1800
  if (+timestamp !== 0 && timestamp < (+new Date() / 1e3 - THIRY_MINUTES))
    throw new Error("Can't fetch historical data")

  return Promise.all([
    getTokenPrices(timestamp),
  ])
}
const chain = 'elrond'

async function getAshPools() {
  const pricesTemp: any = {}
  const prices: any = {}
  const { data: { data: { tokens, pools, poolsV2 } } } = await axios.post('https://api-v2.ashswap.io/graphql', {
    query: `{
      pools {
        address
        totalSupply
        lpToken {
          id
          price
        }
        reserves
        state
        swapFeePercent
      }
      poolsV2 {
        address
        totalSupply
        lpToken {
          id
          price
        }
        reserves
        state
      }
      tokens{
        id
        price
      }
    }`,
    operationName: null,
    variables: {},
  })
  pools.forEach((pool: any) => pricesTemp[pool.lpToken.id] = pool.lpToken.price)
  poolsV2.forEach((pool: any) => pricesTemp[pool.lpToken.id] = pool.lpToken.price)
  tokens.forEach((pool: any) => pricesTemp[pool.id] = pool.price)
  const tokenIds = Object.keys(pricesTemp)
  const lpInfo: any = await getTokenData(tokenIds)

  for (const token of tokenIds) {
    const info = lpInfo[token]
    if (info) {
      prices[token] = { ...info, price: pricesTemp[token] }
    }
  }

  return prices
}

async function getTokenData(tokens: any[]) {
  tokens = [...new Set(tokens)]
  const { data: lpData } = await axios.get(`https://api.multiversx.com/tokens?identifiers=${tokens.join(',')}`)
  const lpInfo: any = {}
  lpData.forEach((i: any) => lpInfo[i.identifier] = i)
  return lpInfo
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
  const poolIds = filteredPools.map(({ liquidityPoolToken: { identifier } }: any) => identifier)
  const lpInfo: any = await getTokenData(poolIds)
  filteredPools.forEach(({ firstToken, secondToken, liquidityPoolToken, lockedValueUSD, }: any) => {
    prices[firstToken.identifier] = firstToken
    prices[secondToken.identifier] = secondToken
    const lpDatum = lpInfo[liquidityPoolToken.identifier]
    if (lpDatum) {
      liquidityPoolToken.price = +lockedValueUSD * (10 ** liquidityPoolToken.decimals) / +lpDatum.supply
      prices[liquidityPoolToken.identifier] = liquidityPoolToken
    }
  })
}

async function addswTAO(timestamp: any, writes: Write[]) {
  const { data } = await axios.post('https://api.multiversx.com/query', {
    scAddress: 'erd1qqqqqqqqqqqqqpgqhykmg59ny8tem37m0gng3ygwtphmefyz78ssfecn6q',
    funcName: 'getExchangeRate',
    args: []
  })
  const base = 'elrond:WTAO-4f5363'
  const { data: { coins }} = await axios.get('https://coins.llama.fi/prices/current/'+base)
  if (!coins[base]) return;

  const exchangeRate = parseNumber(data.returnData[0]) / 1e18
  const price = coins[base].price * exchangeRate
  addToDBWritesList(writes, chain, 'SWTAO-356a25', price, 9, 'SWTAO', timestamp, 'xexchange', 0.9)
}

async function getTokenPrices(timestamp: number) {
  const writes: Write[] = [];
  await addswTAO(timestamp, writes)

  const prices: any = await getAshPools()
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


function parseNumber(buffer: any): any {
  buffer = Buffer.from(buffer || "", "base64")
  // https://github.com/juanelas/bigint-conversion/blob/master/src/ts/index.ts#L63
  buffer = new Uint8Array(buffer)
  let bits = BigInt(8)

  let ret = BigInt(0)
  for (const i of buffer.values()) {
    const bi = BigInt(i)
    ret = (ret << bits) + bi
  }
  return ret.toString()
}