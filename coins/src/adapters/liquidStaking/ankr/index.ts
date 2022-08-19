import getTokenPrices from "./ankr";

export function uniswap(timestamp: number = 0) {
  console.log("starting ankr");
  return getTokenPrices(timestamp);
}
