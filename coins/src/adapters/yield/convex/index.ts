import getTokenPrices from "./convex";

export function convex(timestamp: number = 0) {
  console.log("starting convex");
  return Promise.all([
    getTokenPrices(timestamp, "ethereum"),
    getTokenPrices(timestamp, "arbitrum")
  ]);
}
