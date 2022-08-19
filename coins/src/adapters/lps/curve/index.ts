import getTokenPrices from "./curve";

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
    //getTokenPrices("arbitrum", ["stableswap", "crypto"], timestamp),
    // getTokenPrices("polygon", timestamp),
    getTokenPrices("xdai", ["stableswap", "crypto"], timestamp)
  ]);
}
export function curve3(timestamp: number = 0) {
  console.log("starting curve3");
  return Promise.all([
    //getTokenPrices("avax", ["stableswap", "crypto"], timestamp),
    getTokenPrices("fantom", ["stableswap", "crypto"], timestamp)
  ]);
}
export function curve3b(timestamp: number = 0) {
  console.log("starting curve3");
  return Promise.all([
    getTokenPrices("avax", ["stableswap", "crypto"], timestamp)
    //getTokenPrices("fantom", ["stableswap", "crypto"], timestamp)
  ]);
}
export function curve4(timestamp: number = 0) {
  console.log("starting curve4");
  return Promise.all([
    getTokenPrices("moonbeam", ["stableswap", "crypto"], timestamp),
    getTokenPrices("aurora", ["stableswap", "crypto"], timestamp),
    getTokenPrices("optimism", ["stableswap", "crypto"], timestamp),
    getTokenPrices("moonbeam", ["stableFactory", "cryptoFactory"], timestamp),
    getTokenPrices("aurora", ["stableFactory", "cryptoFactory"], timestamp),
    getTokenPrices("optimism", ["stableFactory", "cryptoFactory"], timestamp)
  ]);
}
export function curve5(timestamp: number = 0) {
  console.log("starting curve5");
  return Promise.all([
    getTokenPrices("arbitrum", ["stableswap", "crypto"], timestamp)
    // getTokenPrices("polygon", timestamp),
    // getTokenPrices("xdai", ["stableswap", "crypto"], timestamp)
  ]);
}
export function curve5b(timestamp: number = 0) {
  console.log("starting curve5b");
  return Promise.all([
    // getTokenPrices("arbitrum", ["stableswap", "crypto"], timestamp)
    // getTokenPrices("polygon", timestamp),
    getTokenPrices("xdai", ["stableswap", "crypto"], timestamp)
  ]);
}
export function curve6(timestamp: number = 0) {
  console.log("starting curve6");
  return Promise.all([
    getTokenPrices("arbitrum", ["stableswap", "crypto"], timestamp)
    // getTokenPrices("polygon", timestamp),
    // getTokenPrices("xdai", ["stableswap", "crypto"], timestamp)
  ]);
}
export function curve7(timestamp: number = 0) {
  console.log("starting curve7");
  return Promise.all([
    getTokenPrices("arbitrum", ["stableFactory", "cryptoFactory"], timestamp)
    // getTokenPrices("polygon", timestamp),
    // getTokenPrices("xdai", ["stableFactory", "cryptoFactory"], timestamp)
  ]);
}
export function curve8(timestamp: number = 0) {
  console.log("starting curve8");
  return Promise.all([
    getTokenPrices("avax", ["stableFactory", "cryptoFactory"], timestamp)
    //getTokenPrices("fantom", ["stableFactory", "cryptoFactory"], timestamp)
  ]);
}
export function curve9(timestamp: number = 0) {
  console.log("starting curve9");
  return Promise.all([
    //getTokenPrices("avax", ["stableFactory", "cryptoFactory"], timestamp),
    getTokenPrices("fantom", ["stableFactory", "cryptoFactory"], timestamp)
  ]);
}
export function curve10(timestamp: number = 0) {
  console.log("starting curve10");
  return Promise.all([
    // getTokenPrices("arbitrum", ["stableFactory", "cryptoFactory"], timestamp),
    // getTokenPrices("polygon", timestamp),
    getTokenPrices("xdai", ["stableFactory", "cryptoFactory"], timestamp)
  ]);
}
export async function ellipsis(timestamp: number = 0) {
  console.log("starting ellipsis");
  return await getTokenPrices(
    "bsc",
    ["crypto", "stableswap", "stableFactory", "cryptoFactory"],
    timestamp
  );
}
