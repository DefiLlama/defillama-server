import getTokenPrices from "./balancer";
export function balancer(timestamp: number = 0) {
  console.log("starting balancer lps");
  return Promise.all([
    getTokenPrices("polygon", timestamp),
    getTokenPrices("arbitrum", timestamp),
    getTokenPrices("ethereum", timestamp)
  ]);
}
