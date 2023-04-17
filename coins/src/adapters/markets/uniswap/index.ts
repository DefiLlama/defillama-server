import getTokenPrices from "./uniswap";

export function uniswap(timestamp: number = 0) {
  console.log("starting uniswap");
  return getTokenPrices(
    "ethereum",
    "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    "https://api.thegraph.com/subgraphs/name/ianlapham/uniswapv2",
    timestamp,
  );
}
export function sushiswap1(timestamp: number = 0) {
  console.log("starting sushiswap1");
  return Promise.all([
    getTokenPrices(
      "ethereum",
      "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac",
      undefined,
      undefined,
      timestamp,
    ),
  ]);
}
export function sushiswap2(timestamp: number = 0) {
  console.log("starting sushiswap2");
  const factoryAddress = "0xc35DADB65012eC5796536bD9864eD8773aBc74C4";
  return Promise.all([
    getTokenPrices("polygon", factoryAddress, undefined, undefined, timestamp),
    getTokenPrices("arbitrum", factoryAddress, undefined, undefined, timestamp),
    getTokenPrices("avax", factoryAddress, undefined, undefined, timestamp),
    getTokenPrices(
      "moonriver",
      factoryAddress,
      undefined,
      undefined,
      timestamp,
    ),
    getTokenPrices("fantom", factoryAddress, undefined, undefined, timestamp),
    getTokenPrices("bsc", factoryAddress, undefined, undefined, timestamp),
    getTokenPrices("xdai", factoryAddress, undefined, undefined, timestamp),
    // getTokenPrices("harmony", factoryAddress, undefined, undefined, timestamp)
  ]);
}
export function pancakeswap(timestamp: number = 0) {
  console.log("starting pancakeswap");
  return getTokenPrices(
    "bsc",
    "0xca143ce32fe78f1f7019d7d551a6402fc5350c73",
    undefined,
    "https://bsc.streamingfast.io/subgraphs/name/pancakeswap/exchange-v2",
    timestamp,
  );
}
export function traderJoe(timestamp: number = 0) {
  console.log("starting traderjoe");
  return getTokenPrices(
    "avax",
    "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10",
    undefined,
    "https://api.thegraph.com/subgraphs/name/traderjoe-xyz/exchange",
    timestamp,
  );
}
export function vvsFinance(timestamp: number = 0) {
  console.log("starting vvs finance");
  return getTokenPrices(
    "cronos",
    "0x3b44b2a187a7b3824131f8db5a74194d0a42fc15",
    undefined,
    undefined,
    timestamp,
  );
}
export function quickswap(timestamp: number = 0) {
  console.log("starting quickswap");
  return getTokenPrices(
    "polygon",
    "0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32",
    undefined,
    "https://api.thegraph.com/subgraphs/name/andyjagoe/quickswap-v2-metrics",
    timestamp,
  );
}
export function biswap(timestamp: number = 0) {
  console.log("starting biswap");
  return getTokenPrices(
    "bsc",
    "0x858e3312ed3a876947ea49d572a7c42de08af7ee",
    undefined,
    undefined,
    timestamp,
  );
}
export function mmFinance(timestamp: number = 0) {
  console.log("starting mm finance");
  return getTokenPrices(
    "cronos",
    "0xd590cC180601AEcD6eeADD9B7f2B7611519544f4",
    undefined,
    undefined,
    timestamp,
  );
}
export function trisolaris(timestamp: number = 0) {
  console.log("starting trisolaris");
  return getTokenPrices(
    "aurora",
    "0xc66F594268041dB60507F00703b152492fb176E7",
    undefined,
    undefined,
    timestamp,
  );
}
export function pangolin(timestamp: number = 0) {
  console.log("starting pangolin");
  return getTokenPrices(
    "avax",
    "0xefa94DE7a4656D787667C749f7E1223D71E9FD88",
    undefined,
    undefined,
    timestamp,
  );
}
export function spiritswap(timestamp: number = 0) {
  console.log("starting spiritswap");
  return getTokenPrices(
    "fantom",
    "0xEF45d134b73241eDa7703fa787148D9C9F4950b0",
    undefined,
    undefined,
    timestamp,
  );
}

export function spookyswap(timestamp: number = 0) {
  console.log("starting spookyswap");
  return getTokenPrices(
    "fantom",
    "0x152ee697f2e276fa89e96742e9bb9ab1f2e61be3",
    "0xF491e7B69E4244ad4002BC14e878a34207E38c29",
    undefined,
    timestamp,
  );
}
export function tombswap(timestamp: number = 0) {
  console.log("starting tombswap");
  return getTokenPrices(
    "fantom",
    "0xE236f6890F1824fa0a7ffc39b1597A5A6077Cfe9",
    undefined,
    undefined,
    timestamp,
  );
}
export function wemix(timestamp: number = 0) {
  console.log("starting wemix");
  return getTokenPrices(
    "wemix",
    "0xe1F36C7B919c9f893E2Cd30b471434Aa2494664A",
    undefined,
    undefined,
    timestamp,
  );
}
export function solidly(timestamp: number = 0) {
  console.log("starting solidly");
  return getTokenPrices(
    "fantom",
    "0x3fAaB499b519fdC5819e3D7ed0C26111904cbc28",
    undefined,
    undefined,
    timestamp,
  );
}
export function diffusion(timestamp: number = 0) {
  console.log("starting diffusion");
  return getTokenPrices(
    "evmos",
    "0x6abdda34fb225be4610a2d153845e09429523cd2",
    undefined,
    undefined,
    timestamp,
  );
}
export function equalizer(timestamp: number = 0) {
  console.log("starting equalizer");
  return getTokenPrices(
    "fantom",
    "0xc6366efd0af1d09171fe0ebf32c7943bb310832a",
    "0x1a05eb736873485655f29a37def8a0aa87f5a447",
    undefined,
    timestamp,
  );
}
export function camelot(timestamp: number = 0) {
  console.log("starting camelot");
  return getTokenPrices(
    "arbitrum",
    "0x6eccab422d763ac031210895c81787e87b43a652",
    "0xc873fecbd354f5a56e00e710b90ef4201db2448d",
    undefined,
    timestamp,
  );
}
export function velocore(timestamp: number = 0) {
  console.log("starting velocore");
  return getTokenPrices(
    "era",
    "0xe140eac2bb748c8f456719a457f26636617bb0e9",
    "0x46dbd39e26a56778d88507d7aec6967108c0bd36",
    undefined,
    timestamp,
  );
}
export function mute(timestamp: number = 0) {
  console.log("starting mute");
  return getTokenPrices(
    "era",
    "0x40be1cba6c5b47cdf9da7f963b6f761f4c60627d",
    "0x8b791913eb07c32779a16750e3868aa8495f5964",
    undefined,
    timestamp,
  );
}
export function spacefi(timestamp: number = 0) {
  console.log("starting spacefi");
  return getTokenPrices(
    "era",
    "0x0700fb51560cfc8f896b2c812499d17c5b0bf6a7",
    undefined,
    undefined,
    timestamp,
  );
}
export function gemswap(timestamp: number = 0) {
  console.log("starting gemswap");
  return getTokenPrices(
    "era",
    "0x065c8703132F2A38Be3d2dbF7Be6BE455930560c",
    "0x70B86390133d4875933bE54AE2083AAEbe18F2dA",
    undefined,
    timestamp,
  );
}
