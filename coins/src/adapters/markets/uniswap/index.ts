import getTokenPrices from "./uniswap";

export function uniswap(timestamp: number = 0) {
  console.log("starting uniswap");
  return getTokenPrices(
    "ethereum",
    "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
    undefined,
    timestamp
  );
}
export function sushiswap(timestamp: number = 0) {
  console.log("starting sushiswap");
  const factoryAddress = "0xc35DADB65012eC5796536bD9864eD8773aBc74C4";
  return Promise.all([
    getTokenPrices(
      "ethereum",
      "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac",
      undefined,
      timestamp
    )
    // getTokenPrices("polygon", factoryAddress, undefined, timestamp),
    // getTokenPrices("arbitrum", factoryAddress, undefined, timestamp),
    // getTokenPrices("avax", factoryAddress, undefined, timestamp),
    // getTokenPrices("moonriver", factoryAddress, undefined, timestamp),
    // getTokenPrices("fantom", factoryAddress, undefined, timestamp),
    // getTokenPrices("bsc", factoryAddress, undefined, timestamp),
    // getTokenPrices("xdai", factoryAddress, undefined, timestamp),
    // getTokenPrices("harmony", factoryAddress, undefined, timestamp)
  ]);
}
export function pancakeswap(timestamp: number = 0) {
  return getTokenPrices(
    "bsc",
    "0xca143ce32fe78f1f7019d7d551a6402fc5350c73",
    "https://bsc.streamingfast.io/subgraphs/name/pancakeswap/exchange-v2",
    timestamp
  );
}
export function traderJoe(timestamp: number = 0) {
  return getTokenPrices(
    "avax",
    "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10",
    undefined,
    timestamp
  );
}
export function vvsFinance(timestamp: number = 0) {
  return getTokenPrices(
    "cronos",
    "0x3b44b2a187a7b3824131f8db5a74194d0a42fc15",
    undefined,
    timestamp
  );
}
export function quickswap(timestamp: number = 0) {
  return getTokenPrices(
    "polygon",
    "0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32",
    undefined,
    timestamp
  );
}
export function biswap(timestamp: number = 0) {
  return getTokenPrices(
    "bsc",
    "0x858e3312ed3a876947ea49d572a7c42de08af7ee",
    undefined,
    timestamp
  );
}
export function mmFinance(timestamp: number = 0) {
  return getTokenPrices(
    "cronos",
    "0xd590cC180601AEcD6eeADD9B7f2B7611519544f4",
    undefined,
    timestamp
  );
}
export function trisolaris(timestamp: number = 0) {
  return getTokenPrices(
    "aurora",
    "0xc66F594268041dB60507F00703b152492fb176E7",
    undefined,
    timestamp
  );
}
export function pangolin(timestamp: number = 0) {
  return getTokenPrices(
    "avax",
    "0xefa94DE7a4656D787667C749f7E1223D71E9FD88",
    undefined,
    timestamp
  );
}
export function spiritswap(timestamp: number = 0) {
  return getTokenPrices(
    "fantom",
    "0xEF45d134b73241eDa7703fa787148D9C9F4950b0",
    undefined,
    timestamp
  );
}
