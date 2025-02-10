import getTokenPrices from "./yearnV2";

export function yearn(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices("ethereum", timestamp),
    getTokenPrices("base", timestamp),
    getTokenPrices("optimism", timestamp),
  ]);
}
