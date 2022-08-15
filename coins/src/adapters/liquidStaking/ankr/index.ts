import getTokenPrices from "./ankr";

export function uniswap(timestamp: number = 0) {
  return getTokenPrices(timestamp);
}
