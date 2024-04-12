import getTokenPrices from "./uniswap";
import getExtras from "./extraLp";

export function uniswap(timestamp: number = 0) {
  return getTokenPrices(
    "ethereum",
    "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    //"https://api.thegraph.com/subgraphs/name/ianlapham/uniswapv2",
    "https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v2-dev",
    timestamp,
  );
}
export function sushiswap1(timestamp: number = 0) {
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
  const factoryAddress = "0xc35DADB65012eC5796536bD9864eD8773aBc74C4";
  return Promise.all([
    getTokenPrices("arbitrum", factoryAddress, undefined, undefined, timestamp),
    // getTokenPrices("harmony", factoryAddress, undefined, undefined, timestamp)
  ]);
}
export function sushiswap3(timestamp: number = 0) {
  const factoryAddress = "0xc35DADB65012eC5796536bD9864eD8773aBc74C4";
  return Promise.all([
    getTokenPrices("polygon", factoryAddress, undefined, undefined, timestamp),
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
    // getTokenPrices("xdai", factoryAddress, undefined, undefined, timestamp),
    // getTokenPrices("harmony", factoryAddress, undefined, undefined, timestamp)
  ]);
}
export function pancakeswap(timestamp: number = 0) {
  return getTokenPrices(
    "bsc",
    "0xca143ce32fe78f1f7019d7d551a6402fc5350c73",
    undefined,
    "https://bsc.streamingfast.io/subgraphs/name/pancakeswap/exchange-v2",
    timestamp,
  );
}
export function traderJoe(timestamp: number = 0) {
  return getTokenPrices(
    "avax",
    "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10",
    undefined,
    undefined,
    timestamp,
  );
}
export function vvsFinance(timestamp: number = 0) {
  return getTokenPrices(
    "cronos",
    "0x3b44b2a187a7b3824131f8db5a74194d0a42fc15",
    undefined,
    undefined,
    timestamp,
  );
}
export function quickswap(timestamp: number = 0) {
  return getTokenPrices(
    "polygon",
    "0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32",
    undefined,
    "https://api.thegraph.com/subgraphs/name/andyjagoe/quickswap-v2-metrics",
    timestamp,
  );
}
export function biswap(timestamp: number = 0) {
  return getTokenPrices(
    "bsc",
    "0x858e3312ed3a876947ea49d572a7c42de08af7ee",
    undefined,
    undefined,
    timestamp,
  );
}
export function mmFinance(timestamp: number = 0) {
  return getTokenPrices(
    "cronos",
    "0xd590cC180601AEcD6eeADD9B7f2B7611519544f4",
    undefined,
    undefined,
    timestamp,
  );
}
export function trisolaris(timestamp: number = 0) {
  return getTokenPrices(
    "aurora",
    "0xc66F594268041dB60507F00703b152492fb176E7",
    undefined,
    undefined,
    timestamp,
  );
}
export function pangolin(timestamp: number = 0) {
  return getTokenPrices(
    "avax",
    "0xefa94DE7a4656D787667C749f7E1223D71E9FD88",
    undefined,
    undefined,
    timestamp,
  );
}
export function spiritswap(timestamp: number = 0) {
  return getTokenPrices(
    "fantom",
    "0xEF45d134b73241eDa7703fa787148D9C9F4950b0",
    undefined,
    undefined,
    timestamp,
  );
}

export function spookyswap(timestamp: number = 0) {
  return getTokenPrices(
    "fantom",
    "0x152ee697f2e276fa89e96742e9bb9ab1f2e61be3",
    "0xF491e7B69E4244ad4002BC14e878a34207E38c29",
    undefined,
    timestamp,
  );
}
export function tombswap(timestamp: number = 0) {
  return getTokenPrices(
    "fantom",
    "0xE236f6890F1824fa0a7ffc39b1597A5A6077Cfe9",
    undefined,
    undefined,
    timestamp,
  );
}
export function wemix(timestamp: number = 0) {
  return getTokenPrices(
    "wemix",
    "0xe1F36C7B919c9f893E2Cd30b471434Aa2494664A",
    undefined,
    undefined,
    timestamp,
  );
}
export function solidly(timestamp: number = 0) {
  return getTokenPrices(
    "fantom",
    "0x3fAaB499b519fdC5819e3D7ed0C26111904cbc28",
    undefined,
    undefined,
    timestamp,
  );
}
export function diffusion(timestamp: number = 0) {
  return getTokenPrices(
    "evmos",
    "0x6abdda34fb225be4610a2d153845e09429523cd2",
    undefined,
    undefined,
    timestamp,
  );
}
export function equalizer(timestamp: number = 0) {
  return getTokenPrices(
    "fantom",
    "0xc6366efd0af1d09171fe0ebf32c7943bb310832a",
    "0x1a05eb736873485655f29a37def8a0aa87f5a447",
    undefined,
    timestamp,
  );
}
export function camelot(timestamp: number = 0) {
  return getTokenPrices(
    "arbitrum",
    "0x6eccab422d763ac031210895c81787e87b43a652",
    "0xc873fecbd354f5a56e00e710b90ef4201db2448d",
    undefined,
    timestamp,
  );
}
export function velocore(timestamp: number = 0) {
  return getTokenPrices(
    "era",
    "0xe140eac2bb748c8f456719a457f26636617bb0e9",
    "0x46dbd39e26a56778d88507d7aec6967108c0bd36",
    undefined,
    timestamp,
  );
}
export function mute(timestamp: number = 0) {
  return getTokenPrices(
    "era",
    "0x40be1cba6c5b47cdf9da7f963b6f761f4c60627d",
    "0x8b791913eb07c32779a16750e3868aa8495f5964",
    undefined,
    timestamp,
  );
}
export function spacefi(timestamp: number = 0) {
  return getTokenPrices(
    "era",
    "0x0700fb51560cfc8f896b2c812499d17c5b0bf6a7",
    undefined,
    undefined,
    timestamp,
  );
}
export function gemswap(timestamp: number = 0) {
  return getTokenPrices(
    "era",
    "0x065c8703132F2A38Be3d2dbF7Be6BE455930560c",
    "0x70B86390133d4875933bE54AE2083AAEbe18F2dA",
    undefined,
    timestamp,
  );
}
export function glacier(timestamp: number = 0) {
  return getTokenPrices(
    "avax",
    "0xac7b7eac8310170109301034b8fdb75eca4cc491",
    "0xc5b8ce3c8c171d506deb069a6136a351ee1629dc",
    undefined,
    timestamp,
  );
}
export function thena(timestamp: number = 0) {
  return getTokenPrices(
    "bsc",
    "0xAFD89d21BdB66d00817d4153E055830B1c2B3970",
    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64",
    undefined,
    timestamp,
  );
}
export function extraUniV2Lps(timestamp: number = 0) {
  return Promise.all([
    getExtras(
      timestamp,
      "0x82DB765c214C1AAB16672058A3C22b12F6A42CD0",
      "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
      "avax",
    ),
    getExtras(
      timestamp,
      "0x5f973e06a59d0bafe464faf36d5b3b06e075c543",
      "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
      "avax",
    ),
    getExtras(
      timestamp,
      "0xd1f377b881010cb97ab0890a5ef908c45bcf13f9",
      "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
      "avax",
    ),
    getExtras(
      timestamp,
      "0x517F9dD285e75b599234F7221227339478d0FcC8",
      "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      "ethereum",
    ),
    getExtras(
      timestamp,
      "0x3A0eF60e803aae8e94f741E7F61c7CBe9501e569",
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      "ethereum",
    ),
  ]);
}
export function fvm(timestamp: number = 0) {
  return getTokenPrices(
    "fantom",
    "0x472f3C3c9608fe0aE8d702f3f8A2d12c410C881A",
    "0x2E14B53E2cB669f3A974CeaF6C735e134F3Aa9BC",
    undefined,
    timestamp,
  );
}
export function velocimeter(timestamp: number = 0) {
  return getTokenPrices(
    "base",
    "0xe21Aac7F113Bd5DC2389e4d8a8db854a87fD6951",
    "0xE11b93B61f6291d35c5a2beA0A9fF169080160cF",
    undefined,
    timestamp,
  );
}
export function pulsex(timestamp: number = 0) {
  return getTokenPrices(
    "pulse",
    "0x1715a3E4A142d8b698131108995174F37aEBA10D",
    "0xc40cE31d9bcBe2edFbD30D0a7503f6C663b69877",
    undefined,
    timestamp,
  );
}

export function zkSwap(timestamp: number = 0) {
  return getTokenPrices(
    "era",
    "0x3a76e377ED58c8731F9DF3A36155942438744Ce3",
    undefined,
    undefined,
    timestamp,
  );
}

export function elysium(timestamp: number = 0) {
  return getTokenPrices(
    "elsm",
    "0x5bec5d65fAba8E90e4a74f3da787362c60F22DaE",
    undefined,
    undefined,
    timestamp,
  );
}

export function zkswap(timestamp: number = 0) {
  return getTokenPrices(
    "polygon_zkevm",
    "0x51A0D4B81400581d8722627daFCd0c1Ff9357d1D",
    undefined,
    undefined,
    timestamp,
  );
}

export function aerodrome(timestamp: number = 0) {
  return getTokenPrices(
    "base",
    "0x420DD381b31aEf6683db6B902084cB0FFECe40Da",
    "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43",
    undefined,
    timestamp,
    true,
  );
}

export function jibswap(timestamp: number = 0) {
  return getTokenPrices(
    "jbc",
    "0x4BBdA880C5A0cDcEc6510f0450c6C8bC5773D499",
    "0x766F8C9321704DC228D43271AF9b7aAB0E529D38",
    undefined,
    timestamp,
  );
}
