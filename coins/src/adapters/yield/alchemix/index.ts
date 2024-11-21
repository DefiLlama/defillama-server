import getTokenPrices from "./alchemix";

export function alchemix(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices("optimism", timestamp),
    getTokenPrices("xdai", timestamp),
    // getTokenPrices("avax", timestamp),
  ]);
}
