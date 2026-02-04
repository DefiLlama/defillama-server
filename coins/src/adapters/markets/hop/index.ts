import getTokenPrices from "./hop";

export function hop(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices(timestamp, "polygon"),
    getTokenPrices(timestamp, "xdai"),
    getTokenPrices(timestamp, "optimism"),
    getTokenPrices(timestamp, "arbitrum")
  ]);
}
