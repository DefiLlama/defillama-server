import getTokenPrices from "./mean-finance";

export function meanFinance(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices("optimism", timestamp),
    getTokenPrices("polygon", timestamp),
    getTokenPrices("arbitrum", timestamp),
    getTokenPrices("ethereum", timestamp),
    getTokenPrices("bsc", timestamp),
    getTokenPrices("xdai", timestamp),
    getTokenPrices("moonbeam", timestamp),
    getTokenPrices("rsk", timestamp),
    getTokenPrices("avalanche", timestamp),
    getTokenPrices("base", timestamp),
  ]);
}
