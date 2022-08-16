import getTokenPrices from "./curve";

export function curve(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices("ethereum", timestamp),
    getTokenPrices("optimism", timestamp),
    //getTokenPrices("polygon", timestamp),
    getTokenPrices("xdai", timestamp),
    getTokenPrices("avax", timestamp),
    getTokenPrices("fantom", timestamp),
    getTokenPrices("optimism", timestamp),
    getTokenPrices("moonbeam", timestamp),
    getTokenPrices("aurora", timestamp)
  ]);
}
