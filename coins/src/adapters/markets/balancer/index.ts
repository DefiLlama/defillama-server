import getTokenPrices from "./balancer";
import linearPrices from "./linearPools";

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
export function balancer4(timestamp: number = 0) {
  console.log("starting balancer4 lps");
  return getTokenPrices("optimism", timestamp);
}
export function balancer5(timestamp: number = 0) {
  console.log("starting balancer5 lps");
  return Promise.all([
    getTokenPrices("avax", timestamp),
    getTokenPrices("xdai", timestamp),
  ]);
}
export function balancer6(timestamp: number = 0) {
  console.log("starting balancer6 lps");
  return getTokenPrices("base", timestamp);
}
export function balancer7(timestamp: number = 0) {
  console.log("starting balancer7 lps");
  return getTokenPrices("polygon_zkevm", timestamp);
}
export function linearPools(timestamp: number = 0) {
  console.log("starting balancer linear pools");
  return Promise.all([
    linearPrices("arbitrum", timestamp),
    linearPrices("polygon", timestamp),
  ]);
}
