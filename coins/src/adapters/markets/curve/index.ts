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
    getTokenPrices2("ethereum", [], timestamp, "eth-custom", [
      "0x7b0eff0c991f0aa880481fdfa5624cb0bc9b10e1",
      "0x326290a1b0004eee78fa6ed4f1d8f4b2523ab669",
      "0x6685fcFCe05e7502bf9f0AA03B36025b09374726",
      "0x8a8434A5952aC2CF4927bbEa3ace255c6dd165CD",
    ]),
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
    getTokenPrices2("arbitrum", [], timestamp, "eth-custom", [
      "0x2FE7AE43591E534C256A1594D326e5779E302Ff4",
      "0xec090cf6DD891D2d014beA6edAda6e05E025D93d",
      "0x73aF1150F265419Ef8a5DB41908B700C32D49135",
      "0x3aDf984c937FA6846E5a24E0A68521Bdaf767cE1",
      "0x8ce4e9d3246e3d629f8ed811c421054dc6542bd6",
      "0x81fdbd700db44c3e57639c2c4518630945c132a6",
      "0x73f8b9739a557d5822f0e431f5e03f614f3bd8a9",
      "0xdf96c0334d628e2fd084111761ae1016f3a1fb3d",
      "0xe699fd2b4ea36af0ca07cee042e0833ab831d067",
    ]),
    getGaugePrices("arbitrum", timestamp),
  ]);
}
export function curve3(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("optimism", defaultRegistries, timestamp),
    getTokenPrices2("optimism", [], timestamp, "eth-custom", [
      "0x95e0A2a90De52C0f03Ba17A0b218442f4f42A78e",
      "0x2ebd3f70aa2f29092f759418e4f9489d14ac403e",
      "0x8f63ccd329d4ba07a3c6703d94d3137a9cfbfc6c",
      "0x555aea44f348c4f53a0160335658a8619006c5b0",
      "0x56fc84bfa907b6ced228ed14a8489c88f7f3ec2a",
    ]),
    getGaugePrices("optimism", timestamp),
  ]);
}
export function curve4(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("polygon", defaultRegistries, timestamp),
    getTokenPrices2("polygon", [], timestamp, "eth-custom", [
      "0xa691d34abf93c0a77998e53b564becfaf46dae27",
    ]),
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
    getTokenPrices2("base", [], timestamp, "eth-custom", [
      "0xf6c5f01c7f3148891ad0e19df78743d31e390d1f",
      "0x6e53131f68a034873b6bfa15502af094ef0c5854",
      "0x6dfe79cece4f64c1a34f48cf5802492ab595257e",
      "0x3b9860321f03afe02d3ff9e4fdd4017dc6f4d7ca",
      "0x1f0dbecda414f401db46464864273cad19368706",
      "0x3e07f263c1ce5ec2a3f1ca87af56b80b27674d96",
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

export const adapters = {
  curve,
  curve1,
  curve2,
  curve3,
  curve4,
  curve5,
  curve6,
  curve7,
  curve8,
  curve9,
  curve10,
  curve11,
  curve12,
  curve13,
};
