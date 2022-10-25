import getTokenPrices from "./hop";

export function uniswap(timestamp: number = 0) {
  console.log("starting hop");
  return Promise.all([
    getTokenPrices(timestamp, "polygon"),
    getTokenPrices(timestamp, "gnosis"),
    getTokenPrices(timestamp, "optimism"),
    getTokenPrices(timestamp, "arbitrum")
  ]);
}
