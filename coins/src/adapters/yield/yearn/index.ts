import getTokenPrices from "./yearnV2";

export function yearn(timestamp: number = 0) {
  console.log("starting yearn");
  return Promise.all([
    getTokenPrices("ethereum", timestamp),
    getTokenPrices("fantom", timestamp),
    getTokenPrices("arbitrum", timestamp),
    getTokenPrices("optimism", timestamp),
  ]);
}
