import { Write, } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";

export interface compoundPricesOptions {
  chain: string;
  cether?: string;
  comptroller: string;
  timestamp: number;
  abis?: any;
  projectName?: string;
}

export async function compoundPrices({ chain, timestamp, cether = '', comptroller, projectName = 'compound-tokens', abis = {} }: compoundPricesOptions) {
  const writes: Write[] = [];
  const api = await getApi(chain, timestamp)
  cether = cether.toLowerCase()
  const { marketsAbi = 'address[]:getAllMarkets', underlyingAbi = 'address:underlying', exchangeRateAbi = 'uint256:exchangeRateStored' } = abis

  const tokens = await api.call({ abi: marketsAbi, target: comptroller, })
  const prices = await api.multiCall({ abi: exchangeRateAbi, calls: tokens, })
  const underlyingTokens = await api.multiCall({ abi: underlyingAbi, calls: tokens, permitFailure: true, } as any)
  underlyingTokens.forEach((u: any, i: any) => { 
    if (u) return;
    if (!cether.length) throw new Error('No cether address provided')
    if (tokens[i].toLowerCase() !== cether) throw new Error('unexpected error')
    underlyingTokens[i] = '0x0000000000000000000000000000000000000000'
   })

  const pricesObject: any = {}
  tokens.forEach((vault: any, i: any) => { pricesObject[vault] = { underlying: underlyingTokens[i], price: prices[i] / 1e18 } })

  return getWrites({ chain, timestamp, writes, pricesObject, projectName })
}
