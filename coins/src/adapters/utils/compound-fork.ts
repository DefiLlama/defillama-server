import { Write, } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";

export interface compoundPricesOptions {
  chain: string;
  comptroller: string;
  timestamp: number;
  abis: any;
  projectName?: string;
}

export async function compoundPrices({ chain, timestamp, comptroller, projectName = 'compound-tokens', abis = {} }: compoundPricesOptions) {
  const writes: Write[] = [];
  const api = await getApi(chain, timestamp)
  const { marketsAbi = 'address[]:getAllMarkets', underlyingAbi = 'address:underlying', exchangeRateAbi = 'uint256:exchangeRateStored' } = abis

  const tokens = await api.call({ abi: marketsAbi, target: comptroller, })
  const prices = await api.multiCall({ abi: exchangeRateAbi, calls: tokens, })
  const underlyingTokens = await api.multiCall({ abi: underlyingAbi, calls: tokens, } as any)

  const pricesObject: any = {}
  tokens.forEach((vault: any, i: any) => { pricesObject[vault] = { underlying: underlyingTokens[i], price: prices[i] / 1e18 } })

  return getWrites({ chain, timestamp, writes, pricesObject, projectName })
}
