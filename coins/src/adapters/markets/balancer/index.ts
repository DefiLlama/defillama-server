import getTokenPrices from "./balancer";
import linearPrices from "./linearPools";

export function balancer1(timestamp: number = 0) {
  return getTokenPrices("polygon", timestamp);
}
export function balancer2(timestamp: number = 0) {
  return getTokenPrices("ethereum", timestamp);
}
export function balancer3(timestamp: number = 0) {
  return getTokenPrices("arbitrum", timestamp);
}
export function balancer4(timestamp: number = 0) {
  return getTokenPrices("optimism", timestamp);
}
export function balancer5(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices("avax", timestamp),
    getTokenPrices("xdai", timestamp),
  ]);
}
export function balancer6(timestamp: number = 0) {
  return getTokenPrices("base", timestamp);
}
export function balancer7(timestamp: number = 0) {
  return getTokenPrices("polygon_zkevm", timestamp);
}
export function linearPools(timestamp: number = 0) {
  return Promise.all([
    linearPrices("arbitrum", timestamp),
    linearPrices("polygon", timestamp),
  ]);
}
