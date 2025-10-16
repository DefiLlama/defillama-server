import { cachedFetch } from "@defillama/sdk/build/util/cache";

export async function fetchAdaTokens(): Promise<any[]> {
  const res = await cachedFetch({key: "muesliswap-token-list", endpoint: "https://api.muesliswap.com/token-list"})
  const coins = res
    .filter((c: any) => c.supply.circulating != null)
    .map((c: any) => ({
      supply: c.supply.circulating,
      symbol: c.symbol,
      decimals: c.decimalPlaces,
      address: c.address.policyId,
    }));

  return coins.map((c: any) => `cardano:${c.address}`);
}
