import { getTokenPrices2 } from "./balancerV2";
// import getTokenPrices from "./balancer";
// import linearPrices from "./linearPools";

export function balancer1(timestamp: number = 0) {
  return getTokenPrices2("polygon", timestamp);
}
export function balancer2(timestamp: number = 0) {
  return getTokenPrices2("ethereum", timestamp);
}
export function balancer3(timestamp: number = 0) {
  return getTokenPrices2("arbitrum", timestamp);
}
export function balancer4(timestamp: number = 0) {
  return getTokenPrices2("optimism", timestamp);
}
export function balancer5(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("avax", timestamp),
    getTokenPrices2("xdai", timestamp),
  ]);
}
export function balancer6(timestamp: number = 0) {
  return getTokenPrices2("base", timestamp);
}
export function balancer7(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("ethereum", timestamp),
    getTokenPrices2("polygon", timestamp),
    getTokenPrices2("avax", timestamp),
    getTokenPrices2("fantom", timestamp),
    getTokenPrices2("arbitrum", timestamp),
    getTokenPrices2("optimism", timestamp),
    getTokenPrices2("xdai", timestamp),
    getTokenPrices2("base", timestamp),
    getTokenPrices2("polygon_zkevm", timestamp),
    getTokenPrices2("mode", timestamp),
    // getTokenPrices2("fraxtal", timestamp),
  ]);
}
export function linearPools(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("arbitrum", timestamp, {
      poolConfig: {
        address: "0xa3B9515A9c557455BC53F7a535A85219b59e8B2E",
        fromBlock: 59209879,
      }
    }),
    getTokenPrices2("polygon", timestamp, {
      poolConfig: {
        address: "0x7bc6c0e73edaa66ef3f6e2f27b0ee8661834c6c9",
        fromBlock: 39037615,
      }
    }),
  ]);
}


export const adapters = {
  // balancer1,
  // balancer2,
  // balancer3,
  // balancer4,
  // balancer5,
  // balancer6,
  balancer7,
  linearPools,
}