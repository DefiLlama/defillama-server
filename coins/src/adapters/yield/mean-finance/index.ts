import getTokenPrices from "./mean-finance";

export function meanFinance(timestamp: number = 0) {
  console.log("starting Mean Finance");
  return Promise.all([
    getTokenPrices("optimism", timestamp),
    getTokenPrices("polygon", timestamp),
    getTokenPrices("arbitrum", timestamp),
    getTokenPrices("ethereum", timestamp),
  ]);
}
