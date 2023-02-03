import { Write, } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";

export interface YieldTokenOptions {
  chain: string;
  timestamp: number;
  tokens: string[];
  priceAbi: string;
  underlyingAbi: string;
  projectName?: string;
}

export default async function getYieldWrites({ chain, timestamp, tokens, priceAbi, underlyingAbi, projectName = 'yield-tokens' }: YieldTokenOptions) {
  const writes: Write[] = [];
  const api = await getApi(chain, timestamp)

  const prices = await api.multiCall({ abi: priceAbi, calls: tokens, })
  const decimals = await api.multiCall({ abi: 'uint8:decimals', calls: tokens, } as any)
  const underlyingTokens = await api.multiCall({ abi: underlyingAbi, calls: tokens, } as any)

  const pricesObject: any = {}
  tokens.forEach((vault: any, i: any) => { pricesObject[vault] = { underlying: underlyingTokens[i], price: prices[i] / (10 ** decimals[i]) } })

  return getWrites({ chain, timestamp, writes, pricesObject, projectName })
}
