import { Chain } from "@defillama/sdk/build/general";
import BigNumber from "bignumber.js";
import { ChainData } from "./types";

export const zero = BigNumber(0);
export const excludedTvlKeys = ["PK", "SK", "tvl"];

export const canonicalBridgeIds: { [id: string]: Chain } = {
  "3782": "mantle",
  "3777": "arbitrum",
  "3778": "nova",
  "3780": "base",
  "3781": "linea",
  // "3783": "metis", // commented out until we get a native bridge token mapping
  "3784": "optimism",
  // "3785": "polygon_zkevm",
  "3786": "scroll", // multiCall RPC failure
  "3787": "starknet",
  "3788": "zksync",
  "1501": "everscale",
  "349": "injecitve",
  "801": "celo",
  "1272": "iotex",
  "2081": "wanchain",
  "2214": "kekchain",
  "3699": "elysium",
  "3813": "alephium",
  "129": "xdai", // multiCall RPC failure
  "240": "polygon",
  "3779": "avax", // multiCall RPC failure
  "3866": "aurora",
  "3861": "rsk",
};
export const protocolBridgeIds: { [chain: string]: Chain } = {
  "144": "dydx",
  "3139": "immutablex",
  "126": "loopring",
  "1878": "apex",
  "344": "zkswap",
};
export const tokenFlowCategories: (keyof ChainData)[] = ["outgoing", "canonical", "incoming", "native"];

export const ownTokens: { [chain: Chain]: { ticker: string; address: string } } = {
  mantle: { ticker: "MNT", address: "0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000" },
  arbitrum: { ticker: "ARB", address: "0x912ce59144191c1204e64559fe8253a0e49e6548" },
  nova: { ticker: "ARB", address: "0xf823c3cd3cebe0a1fa952ba88dc9eef8e0bf46ad" },
  optimism: { ticker: "OP", address: "0x4200000000000000000000000000000000000042" },
  // starknet: { ticker: 'STRK', address: ''},
  celo: { ticker: "CELO", address: "0x471ece3750da237f93b8e339c536989b8978a438" },
  aurora: { ticker: "AURORA", address: "0x8bec47865ade3b172a928df8f990bc7f2a3b9f79" },
};

export const gasTokens: { [chain: Chain]: string } = {
  mantle: "ETH",
  arbitrum: "ETH",
  nova: "ETH",
  base: "ETH",
  linea: "ETH",
  optimism: "ETH",
  scroll: "ETH",
  starknet: "ETH",
  zksync: "ETH",
  // everscale: "EVER",
  // injective: "INJ",
  // celo: "CELO",
  // iotex: "IOTX",
  // wanchain: "WAN",
  // kekchain: "",
  // elysium: "LAVA",
  // alephium: "ALPH",
  // xdai: "XDAI",
  // polygon: "MATIC",
  // avax: "AVAX",
  // aurora: "ETH",
  // rsk: "RBTC",
};
