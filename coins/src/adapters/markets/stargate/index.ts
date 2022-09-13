import getTokenPrices from "./stargate";

export function stargate(timestamp: number = 0) {
  console.log("starting stargate");
  return Promise.all([
    getTokenPrices("ethereum", timestamp),
    getTokenPrices("bsc", timestamp),
    getTokenPrices("avax", timestamp),
    getTokenPrices("polygon", timestamp),
    getTokenPrices("arbitrum", timestamp),
    getTokenPrices("optimism", timestamp),
    getTokenPrices("fantom", timestamp)
  ]);
}
