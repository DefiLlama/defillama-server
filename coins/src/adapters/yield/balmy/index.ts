import getTokenPrices from "./balmy";

export function balmy(timestamp: number = 0) {
  console.log("starting Balmy");
  return Promise.all([
    getTokenPrices("optimism", timestamp),
    getTokenPrices("polygon", timestamp),
    getTokenPrices("arbitrum", timestamp),
    getTokenPrices("ethereum", timestamp),
    getTokenPrices("bsc", timestamp),
    getTokenPrices("xdai", timestamp),
    getTokenPrices("moonbeam", timestamp),
  ]);
}
