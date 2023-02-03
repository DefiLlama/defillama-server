import getTokenPrices from "./yieldYak";

export function yieldYak(timestamp: number = 0) {
  console.log("starting yield-yak");
  return getTokenPrices("avax", timestamp);
}
