import fetch from "node-fetch";

export async function fetchAdaTokens(): Promise<any[]> {
  const res = await fetch(`https://api.muesliswap.com/token-list`).then((r) => r.json());
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
