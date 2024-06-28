import { Write } from "./dbInterfaces";
import { getApi } from "./sdk";
import getWrites from "./getWrites";

export type Result4626 = {
  token: string;
  price: number;
  decimals: number;
  symbol: string;
};
export async function calculate4626Prices(
  chain: any,
  timestamp: number,
  tokens: string[],
  projectName: string,
): Promise<Write[]> {
  const api = await getApi(chain, timestamp)
  const uTokens = await api.multiCall({  abi: 'address:asset', calls: tokens,  permitFailure: true  } as any)
  const supply = await api.multiCall({  abi: 'uint256:totalSupply', calls: tokens,  permitFailure: true  } as any)
  const tokenBals = await api.multiCall({  abi: 'uint256:totalAssets', calls: tokens,  permitFailure: true  } as any)
  const pricesObject: any = {}
  tokens.forEach((token, i) => {
    if (!uTokens[i] || !supply[i] || !tokenBals[i]) return; // Skip if any of the values are null/call failed
    const price = tokenBals[i] / supply[i] 
    if (isNaN(price)) return; // Skip if price is not a number
    pricesObject[token] = { underlying: uTokens[i], price}
  })
  return getWrites({ chain, timestamp, pricesObject, projectName, })
}
