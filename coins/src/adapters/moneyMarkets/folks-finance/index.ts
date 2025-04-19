import getTokenPrices from "./folks-finance";

export function folksFinance(timestamp: number = 0) {
  return getTokenPrices("avax", timestamp);
}
