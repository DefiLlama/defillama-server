import getTokenPrices from "./curve";

export function curve1(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices("ethereum", ["stableswap", "crypto"], timestamp)
  ]);
}
export function curve2(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices("optimism", ["stableswap", "crypto"], timestamp),
    // getTokenPrices("polygon", timestamp),
    getTokenPrices("xdai", ["stableswap", "crypto"], timestamp)
  ]);
}
export function curve3(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices("avax", ["stableswap", "crypto"], timestamp),
    getTokenPrices("fantom", ["stableswap", "crypto"], timestamp)
  ]);
}
export function curve4(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices("optimism", ["stableswap", "crypto"], timestamp),
    getTokenPrices("moonbeam", ["stableswap", "crypto"], timestamp),
    getTokenPrices("aurora", ["stableswap", "crypto"], timestamp)
  ]);
}

export function curve5(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices("ethereum", ["stableFactory", "cryptoFactory"], timestamp)
  ]);
}
export function curve6(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices("optimism", ["stableFactory", "cryptoFactory"], timestamp),
    // getTokenPrices("polygon", timestamp),
    getTokenPrices("xdai", ["stableFactory", "cryptoFactory"], timestamp)
  ]);
}
export function curve7(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices("avax", ["stableFactory", "cryptoFactory"], timestamp),
    getTokenPrices("fantom", ["stableFactory", "cryptoFactory"], timestamp)
  ]);
}
export function curve8(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices("optimism", ["stableFactory", "cryptoFactory"], timestamp),
    getTokenPrices("moonbeam", ["stableFactory", "cryptoFactory"], timestamp),
    getTokenPrices("aurora", ["stableFactory", "cryptoFactory"], timestamp)
  ]);
}
