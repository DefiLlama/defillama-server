import getTokenPrices from "./curve";
import getGaugePrices from "./gauges";

export function curve1(timestamp: number = 0) {
  console.log("starting curve1");
  return Promise.all([
    getTokenPrices("ethereum", ["stableswap", "crypto"], timestamp),
    getTokenPrices("ethereum", ["stableFactory", "cryptoFactory"], timestamp)
  ]);
}
export function curve2(timestamp: number = 0) {
  console.log("starting curve2");
  return Promise.all([
    getTokenPrices("arbitrum", ["stableswap", "crypto"], timestamp),
    getTokenPrices("xdai", ["stableswap", "crypto"], timestamp),
    getTokenPrices("arbitrum", ["stableFactory", "cryptoFactory"], timestamp),
    getTokenPrices("xdai", ["stableFactory", "cryptoFactory"], timestamp)
  ]);
}
export function curve3(timestamp: number = 0) {
  console.log("starting curve3");
  return Promise.all([
    getTokenPrices("avax", ["stableswap", "crypto"], timestamp),
    getTokenPrices("fantom", ["stableswap", "crypto"], timestamp),
    getTokenPrices("avax", ["stableFactory", "cryptoFactory"], timestamp),
    getTokenPrices("fantom", ["stableFactory", "cryptoFactory"], timestamp)
  ]);
}
export function curve4(timestamp: number = 0) {
  console.log("starting curve4");
  return Promise.all([
    getTokenPrices("moonbeam", ["stableswap", "crypto"], timestamp),
    getTokenPrices("aurora", ["stableswap", "crypto"], timestamp),
    getTokenPrices("moonbeam", ["stableFactory", "cryptoFactory"], timestamp),
    getTokenPrices("aurora", ["stableFactory", "cryptoFactory"], timestamp)
  ]);
}
export function curve5a(timestamp: number = 0) {
  console.log("starting curve5a");
  return getTokenPrices("optimism", ["stableswap"], timestamp);
}
export function curve5b(timestamp: number = 0) {
  console.log("starting curve5b");
  return getTokenPrices("optimism", ["crypto"], timestamp);
}
export function curve5c(timestamp: number = 0) {
  console.log("starting curve5c");
  return getTokenPrices("optimism", ["cryptoFactory"], timestamp);
}
export function curve5d(timestamp: number = 0) {
  console.log("starting curve5d");
  return getTokenPrices("optimism", ["stableFactory"], timestamp);
}
export function curve6(timestamp: number = 0) {
  console.log("starting curve6");
  return Promise.all([
    getTokenPrices("polygon", ["stableswap", "crypto"], timestamp),
    getTokenPrices("polygon", ["cryptoFactory"], timestamp)
  ]);
}
export function ellipsis(timestamp: number = 0) {
  console.log("starting ellipsis");
  return getTokenPrices(
    "bsc",
    ["crypto", "stableswap", "stableFactory", "cryptoFactory"],
    timestamp
  );
}
export function gauges(timestamp: number = 0) {
  console.log("starting gauges");
  return getGaugePrices("ethereum", timestamp);
}
