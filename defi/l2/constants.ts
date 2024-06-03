import { Chain } from "@defillama/sdk/build/general";
import BigNumber from "bignumber.js";
import { ChainData } from "./types";
import cgSymbols from "../src/utils/symbols/symbols.json";

export const zero = BigNumber(0);
export const excludedTvlKeys = ["PK", "SK", "tvl"];

export const geckoSymbols = cgSymbols as { [key: string]: string };

export const mixedCaseChains: string[] = ["solana", "tron", "sui", "aptos"];
export const chainsWithoutCanonicalBridges: string[] = [
  "cronos",
  "kava",
  "bsc",
  "tron",
  "ethereum",
  "solana",
  // "sui",
  // "aptos",
  // "stacks",
  "bitcoin",
  // "fantom",
  // "filecoin",
  // "near",
  // "aurora",
];

export const canonicalBridgeIds: { [id: string]: Chain } = {
  "412": "thorchain",
  "3782": "mantle",
  "3777": "arbitrum",
  "3778": "nova",
  "3780": "base",
  "3781": "linea",
  "3784": "optimism",
  "3785": "polygon_zkevm",
  "3786": "scroll",
  "3787": "starknet",
  "3788": "era",
  "1501": "everscale",
  "349": "injective",
  // "801": "celo",
  "1272": "iotex",
  "2081": "wanchain",
  // "2214": "kekchain",
  "2316": "meter",
  "3699": "elysium",
  "3813": "alephium",
  "129": "xdai",
  "240": "polygon",
  "3779": "avax",
  "3783": "metis",
  // "3866": "aurora",
  "3861": "rsk",
  "3936": "zksync",
  "3935": "boba",
  "4032": "manta",
  "4236": "blast",
  "4237": "mode",
  "4335": "zklink",
  "4336": "kinto",
  "4384": "rss3_vsl",
  "4440": "ronin",
  // "3866": "near",
  "4439": "pulsechain",
  "4438": "degen",
  "4690": "lorenzo",
  "4692": "taiko",
  "4702": "immutable zkevm",
};

export const protocolBridgeIds: { [chain: string]: Chain } = {
  "144": "dydx",
  "3139": "immutablex",
  "126": "loopring",
  "1878": "apex",
  "344": "zkswap",
};

export const allChainKeys: string[] = [
  ...chainsWithoutCanonicalBridges,
  ...Object.values(canonicalBridgeIds),
  ...Object.values(protocolBridgeIds),
];

export const tokenFlowCategories: (keyof ChainData)[] = ["outgoing", "canonical", "incoming", "native"];

export const ownTokens: { [chain: Chain]: { ticker: string; address: string } } = {
  bitcoin: { ticker: "BTC", address: "coingecko:bitcoin" },
  ethereum: { ticker: "ETH", address: "coingecko:ethereum" },
  mantle: { ticker: "MNT", address: "coingecko:mantle" },
  arbitrum: { ticker: "ARB", address: "0x912ce59144191c1204e64559fe8253a0e49e6548" },
  nova: { ticker: "ARB", address: "0xf823c3cd3cebe0a1fa952ba88dc9eef8e0bf46ad" },
  optimism: { ticker: "OP", address: "0x4200000000000000000000000000000000000042" },
  polygon_zkevm: { ticker: "MATIC", address: "0xa2036f0538221a77a3937f1379699f44945018d0" },
  starknet: { ticker: "STRK", address: "0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d" },
  everscale: { ticker: "EVER", address: "coingecko:everscale" },
  celo: { ticker: "CELO", address: "coingecko:celo" },
  iotex: { ticker: "IOTX", address: "coingecko:iotex" },
  wanchain: { ticker: "WAN", address: "coingecko:wanchain" },
  xdai: { ticker: "GNO", address: "0x9c58bacc331c9aa871afd802db6379a98e80cedb" },
  polygon: { ticker: "MATIC", address: "0x0000000000000000000000000000000000001010" },
  avax: { ticker: "AVAX", address: "coingecko:avalanche-2" },
  aurora: { ticker: "AURORA", address: "0x8bec47865ade3b172a928df8f990bc7f2a3b9f79" },
  loopring: { ticker: "LRC", address: "0xbbbbca6a901c926f240b89eacb641d8aec7aeafd" },
  immutablex: { ticker: "IMX", address: "0xf57e7e7c23978c3caec3c3548e3d615c346e79ff" },
  immutable_zkevm: { ticker: "IMX", address: "0xf57e7e7c23978c3caec3c3548e3d615c346e79ff" },
  metis: { ticker: "METIS", address: "0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000" },
  meter: { ticker: "MTRG", address: "coingecko:meter" },
  boba: { ticker: "BOBA", address: "0xa18bf3994c0cc6e3b63ac420308e5383f53120d7" },
  solana: { ticker: "SOL", address: "coingecko:solana" },
  manta: { ticker: "MANTA", address: "0x95cef13441be50d20ca4558cc0a27b601ac544e5" },
  zklink: { ticker: "ZKLINK", address: "0x0000000000000000000000000000000000000000" },
  rss3_vsl: { ticker: "RSS3", address: "" },
  // blast: { ticker: "BLAST", address: "" },
  // mode: { ticker: "MODE", address: "" },
  ronin: { ticker: "RON", address: "coingecko:ronin" },
  near: { ticker: "NEAR", address: "coingecko:near" },
  pulsechain: { ticker: "PLS", address: "coingecko:pulsechain" },
  rootstock: { ticker: "RBTC", address: "coingecko:rootstock" },
  stacks: { ticker: "STX", address: "coingecko:blockstack" },
  fantom: { ticker: "FTM", address: "coingecko:fantom" },
  thorchain: { ticker: "RUNE", address: "coingecko:thorchain" },
  filecoin: { ticker: "FIL", address: "coingecko:filecoin" },
  degen: { ticker: "DEGEN", address: "coingecko:degen-base" },
  injective: { ticker: "INJ", address: "coingecko:injective-protocol" },
  // kekchain: { ticker: "" },
  elysium: { ticker: "LAVA", address: "coingecko:lava" },
  alephium: { ticker: "ALPH", address: "" },
  rsk: { ticker: "RBTC", address: "coingecko:rootstock" },
  cronos: { ticker: "CRO", address: "" },
  kava: { ticker: "KAVA", address: "coingecko:kava" },
  bsc: { ticker: "BNB", address: "coingecko:binancecoin" },
  tron: { ticker: "TRON", address: "coingecko:tron" },
  kinto: { ticker: "KINTO", address: "" },
};
