import {
  AaveV2Polygon,
  AaveV2Ethereum,
  AaveV2EthereumAMM,
  AaveV2Avalanche,
  AaveV3Base,
  AaveV3Optimism,
  AaveV3Arbitrum,
  AaveV3Ethereum,
  AaveV3Polygon,
  AaveV3Avalanche,
  AaveV3Scroll,
  AaveV3BNB,
  AaveV3Metis,
  AaveV3Gnosis,
} from "@bgd-labs/aave-address-book";
import getTokenPrices from "./aave";

export function aave(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices(
      "base",
      AaveV3Base.POOL_ADDRESSES_PROVIDER_REGISTRY,
      AaveV3Base.STATIC_A_TOKEN_FACTORY,
      "v3",
      timestamp
    ),
    getTokenPrices(
      "optimism",
      AaveV3Optimism.POOL_ADDRESSES_PROVIDER_REGISTRY,
      AaveV3Optimism.STATIC_A_TOKEN_FACTORY,
      "v3",
      timestamp
    ),
    getTokenPrices(
      "arbitrum",
      AaveV3Arbitrum.POOL_ADDRESSES_PROVIDER_REGISTRY,
      AaveV3Arbitrum.STATIC_A_TOKEN_FACTORY,
      "v3",
      timestamp
    ),
    getTokenPrices(
      "ethereum",
      AaveV2Ethereum.POOL_ADDRESSES_PROVIDER_REGISTRY,
      null,
      "v2",
      timestamp
    ),
    getTokenPrices(
      "ethereum",
      AaveV3Ethereum.POOL_ADDRESSES_PROVIDER_REGISTRY,
      AaveV3Ethereum.STATIC_A_TOKEN_FACTORY,
      "v3",
      timestamp
    ),
    // this still doesn't work though as in aave.ts just the first provider is taken(which is wrong)
    // getTokenPrices(
    //   "ethereum",
    //   AaveV2EthereumAMM.POOL_ADDRESSES_PROVIDER_REGISTRY,
    //   null,
    //   "v2",
    //   timestamp
    // ),
    getTokenPrices(
      "polygon",
      AaveV2Polygon.POOL_ADDRESSES_PROVIDER_REGISTRY,
      null,
      "v2",
      timestamp
    ),
    //polygon V3
    getTokenPrices(
      "polygon",
      AaveV3Polygon.POOL_ADDRESSES_PROVIDER_REGISTRY,
      AaveV3Polygon.STATIC_A_TOKEN_FACTORY,
      "v3",
      timestamp
    ),
    getTokenPrices(
      "avax",
      AaveV2Avalanche.POOL_ADDRESSES_PROVIDER_REGISTRY,
      null,
      "v2",
      timestamp
    ),
    //avax V3
    getTokenPrices(
      "avax",
      AaveV3Avalanche.POOL_ADDRESSES_PROVIDER_REGISTRY,
      AaveV3Avalanche.STATIC_A_TOKEN_FACTORY,
      "v3",
      timestamp
    ),
    getTokenPrices(
      "scroll",
      AaveV3Scroll.POOL_ADDRESSES_PROVIDER_REGISTRY,
      AaveV3Scroll.STATIC_A_TOKEN_FACTORY,
      "v3",
      timestamp
    ),
    getTokenPrices(
      "metis",
      AaveV3Metis.POOL_ADDRESSES_PROVIDER_REGISTRY,
      AaveV3Metis.STATIC_A_TOKEN_FACTORY,
      "v3",
      timestamp
    ),
    getTokenPrices(
      "bsc",
      AaveV3BNB.POOL_ADDRESSES_PROVIDER_REGISTRY,
      AaveV3BNB.STATIC_A_TOKEN_FACTORY,
      "v3",
      timestamp
    ),
    getTokenPrices(
      "gnosis",
      AaveV3Gnosis.POOL_ADDRESSES_PROVIDER_REGISTRY,
      AaveV3Gnosis.STATIC_A_TOKEN_FACTORY,
      "v3",
      timestamp
    ),
  ]);
}
export function geist(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices(
      "fantom",
      "0x4CF8E50A5ac16731FA2D8D9591E195A285eCaA82",
      null,
      "v2",
      timestamp
    ),
  ]);
}
export function radiant(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices(
      "arbitrum",
      "0x7BB843f889e3a0B307299c3B65e089bFfe9c0bE0",
      null,
      "v2",
      timestamp
    ),
    getTokenPrices(
      "arbitrum",
      "0x9D36DCe6c66E3c206526f5D7B3308fFF16c1aa5E",
      null,
      "v2",
      timestamp
    ),
  ]);
}
export function klap(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices(
      "klaytn",
      "0x969E4A05c2F3F3029048e7943274eC2E762497AB",
      null,
      "v2",
      timestamp
    ),
  ]);
}
export function valas(timestamp: number = 0) {
  return getTokenPrices(
    "bsc",
    "0x99E41A7F2Dd197187C8637D1D151Dc396261Bc14",
    null,
    "v2",
    timestamp
  );
}
export function uwulend(timestamp: number = 0) {
  return getTokenPrices(
    "ethereum",
    "0xaC538416BA7438c773F29cF58afdc542fDcABEd4",
    null,
    "v2",
    timestamp
  );
}

export const adapters = {
  aave,
  geist,
  radiant,
  uwulend,
  //klap,
  //valas,
};
