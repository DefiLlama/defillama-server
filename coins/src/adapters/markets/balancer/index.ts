import getTokenPrices from "./balancer";

export function balancer1(timestamp: number = 0) {
  console.log("starting balancer1 lps");
  return getTokenPrices("polygon", timestamp);
}
export function balancer2(timestamp: number = 0) {
  console.log("starting balancer2 lps");
  return getTokenPrices("ethereum", timestamp);
}
export function balancer3(timestamp: number = 0) {
  console.log("starting balancer3 lps");
  return getTokenPrices("arbitrum", timestamp);
}
