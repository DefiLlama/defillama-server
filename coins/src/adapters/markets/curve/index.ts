import getTokenPrices2 from "./curve2";
import getGaugePrices from "./gauges";

const defaultRegistries = [
  "stableswap",
  "crypto",
  "stableFactory",
  "cryptoFactory",
];
export function curve(timestamp: number = 0) {
  console.log("starting curve");
  return Promise.all([getTokenPrices2("ethereum", ["crypto"], timestamp)]);
}
export function curve1(timestamp: number = 0) {
  console.log("starting curve2");
  return Promise.all([getTokenPrices2("fantom", defaultRegistries, timestamp)]);
}
export function curve2(timestamp: number = 0) {
  console.log("starting curve2");
  return Promise.all([
    getTokenPrices2("arbitrum", defaultRegistries, timestamp),
  ]);
}
export function curve3(timestamp: number = 0) {
  console.log("starting curve3");
  return Promise.all([
    getTokenPrices2("optimism", defaultRegistries, timestamp),
  ]);
}
export function curve4(timestamp: number = 0) {
  console.log("starting curve4");
  return Promise.all([
    getTokenPrices2("polygon", defaultRegistries, timestamp),
  ]);
}
export function curve5(timestamp: number = 0) {
  console.log("starting curve5");
  return Promise.all([getTokenPrices2("avax", defaultRegistries, timestamp)]);
}
export function curve6(timestamp: number = 0) {
  console.log("starting curve6");
  return Promise.all([
    getTokenPrices2("ethereum", [], timestamp, "eth-custom", [
      "0x7b0eff0c991f0aa880481fdfa5624cb0bc9b10e1",
    ]),
  ]);
}
export function curve7(timestamp: number = 0) {
  console.log("starting curve7");
  return Promise.all([
    getTokenPrices2("moonbeam", defaultRegistries, timestamp),
  ]);
}
export function curve8(timestamp: number = 0) {
  console.log("starting curve8");
  return Promise.all([getTokenPrices2("aurora", defaultRegistries, timestamp)]);
}
export function curve9(timestamp: number = 0) {
  console.log("starting curve9");
  return Promise.all([getTokenPrices2("celo", defaultRegistries, timestamp)]);
}
export function curve10(timestamp: number = 0) {
  console.log("starting curve10");
  return Promise.all([getTokenPrices2("bsc", defaultRegistries, timestamp)]);
}
export function curve11(timestamp: number = 0) {
  console.log("starting curve11");
  return Promise.all([getTokenPrices2("bsc", ["pcs"], timestamp, "pcs")]);
}
export function curve12(timestamp: number = 0) {
  console.log("starting curve12");
  return Promise.all([getTokenPrices2("xdai", defaultRegistries, timestamp)]);
}
export function gauges(timestamp: number = 0) {
  console.log("starting gauges");
  return Promise.all([
    getGaugePrices("ethereum", timestamp),
    getGaugePrices("arbitrum", timestamp),
    getGaugePrices("polygon", timestamp),
    getGaugePrices("fantom", timestamp),
    getGaugePrices("optimism", timestamp),
    getGaugePrices("avax", timestamp),
    getGaugePrices("moonbeam", timestamp),
    getGaugePrices("xdai", timestamp),
    getGaugePrices("celo", timestamp),
  ]);
}
