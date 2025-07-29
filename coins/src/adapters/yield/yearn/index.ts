import getTokenPrices from "./yearnV2";
import getTokenPricesV3 from "./yearnV3";

export function yearn(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices("ethereum", timestamp),
    getTokenPrices("base", timestamp),
    getTokenPrices("optimism", timestamp),
    getTokenPricesV3("ethereum", timestamp),
    getTokenPricesV3("katana", timestamp),
  ]);
}
