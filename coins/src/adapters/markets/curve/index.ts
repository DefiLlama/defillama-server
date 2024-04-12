import getTokenPrices2 from "./curve2";
import getGaugePrices from "./gauges";

const defaultRegistries = [
  "stableswap",
  "crypto",
  "stableFactory",
  "cryptoFactory",
];
export function curve(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("ethereum", ["crypto"], timestamp),
    getGaugePrices("ethereum", timestamp),
  ]);
}
export function curve1(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("fantom", defaultRegistries, timestamp),
    getGaugePrices("fantom", timestamp),
  ]);
}
export function curve2(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("arbitrum", defaultRegistries, timestamp),
    getGaugePrices("arbitrum", timestamp),
  ]);
}
export function curve3(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("optimism", defaultRegistries, timestamp),
    getGaugePrices("optimism", timestamp),
  ]);
}
export function curve4(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("polygon", defaultRegistries, timestamp),
    getGaugePrices("polygon", timestamp),
  ]);
}
export function curve5(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("avax", defaultRegistries, timestamp),
    getGaugePrices("avax", timestamp),
  ]);
}
export function curve6(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("ethereum", [], timestamp, "eth-custom", [
      "0x7b0eff0c991f0aa880481fdfa5624cb0bc9b10e1",
      "0x326290a1b0004eee78fa6ed4f1d8f4b2523ab669",
      "0x6685fcFCe05e7502bf9f0AA03B36025b09374726",
    ]),
    getTokenPrices2("arbitrum", [], timestamp, "eth-custom", [
      "0x2FE7AE43591E534C256A1594D326e5779E302Ff4",
      "0xec090cf6DD891D2d014beA6edAda6e05E025D93d",
      "0x73aF1150F265419Ef8a5DB41908B700C32D49135",
      "0x3aDf984c937FA6846E5a24E0A68521Bdaf767cE1",
    ]),
  ]);
}
export function curve7(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("moonbeam", defaultRegistries, timestamp),
    getGaugePrices("moonbeam", timestamp),
  ]);
}
export function curve8(timestamp: number = 0) {
  return Promise.all([getTokenPrices2("aurora", defaultRegistries, timestamp)]);
}
export function curve9(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("celo", defaultRegistries, timestamp),
    getGaugePrices("celo", timestamp),
  ]);
}
export function curve10(timestamp: number = 0) {
  return Promise.all([getTokenPrices2("bsc", defaultRegistries, timestamp)]);
}
export function curve11(timestamp: number = 0) {
  return Promise.all([getTokenPrices2("bsc", ["pcs"], timestamp, "pcs")]);
}
export function curve12(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("xdai", defaultRegistries, timestamp),
    getGaugePrices("xdai", timestamp),
  ]);
}
export function curve13(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("kava", defaultRegistries, timestamp),
    getGaugePrices("kava", timestamp),
  ]);
}
