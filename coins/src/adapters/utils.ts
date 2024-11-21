import nodeFetch from "node-fetch"
import { decimals, symbol } from "@defillama/sdk/build/erc20";
import * as sdk from "@defillama/sdk";

export const fetch = async (url: string, requestParams?: any) => nodeFetch(url, requestParams).then(r => r.json())

export function formatExtraTokens(chain: string, tokens: [string, string, string, number][]) {
  return tokens.map(([fromAddress, to, symbol, decimals]) => ({
    from: `${chain}:${fromAddress}`,
    to,
    symbol,
    decimals,
  }))
}

// TODO: inefficient, dont use, use multiCall instead
export function getAllInfo(address: string, chain: string, to: string) {
  return async () => {
    for (let i = 0; i < 3; i++) {
      try {
        const decimalsR = await decimals(address, chain as any)
        const symbolR = await symbol(address, chain as any)
        return {
          from: `${chain}:${address}`,
          to,
          decimals: Number(decimalsR.output),
          symbol: symbolR.output as string,
        }
      } catch (e) { }
    }
    throw new Error(`Couldn't get decimals/symbol on getAllInfo(${address}, ${chain}, ${to})`)
  }
}
type poolValues = {
  [poolId: string]: number
}
export async function getPoolValues({ api, pools }: {
  api: sdk.ChainApi,
  pools: {
    [poolId: string]: sdk.Balances
  }
}): Promise<poolValues> {
  const poolValues: poolValues = {}
  const allBalances = new sdk.Balances({ chain: api.chain, timestamp: api.timestamp })
  for (const poolId of Object.keys(pools)) {
    const pool = pools[poolId]
    allBalances.addBalances(pool)
  }
  await allBalances.getUSDValue() //this will pull all token prices
  for (const poolId of Object.keys(pools)) {
    const usdData = await pools[poolId].getUSDJSONs()
    if (
      Object.keys(usdData.rawTokenBalances).length > 
      Object.keys(usdData.usdTokenBalances).length) continue
    poolValues[poolId] = usdData.usdTvl
  }
  return poolValues
}