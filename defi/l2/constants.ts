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
  "349": "injecitve",
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
  //mantle: { ticker: "mnt", address: "0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000" },
  arbitrum: { ticker: "ARB", address: "0x912ce59144191c1204e64559fe8253a0e49e6548" },
  nova: { ticker: "ARB", address: "0xf823c3cd3cebe0a1fa952ba88dc9eef8e0bf46ad" },
  optimism: { ticker: "OP", address: "0x4200000000000000000000000000000000000042" },
  polygon_zkevm: { ticker: "MATIC", address: "0xa2036f0538221a77a3937f1379699f44945018d0" },
  starknet: { ticker: "STRK", address: "0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d" },
  everscale: { ticker: "EVER", address: "0x29d578cec46b50fa5c88a99c6a4b70184c062953" },
  celo: { ticker: "CELO", address: "0x471ece3750da237f93b8e339c536989b8978a438" },
  iotex: { ticker: "IOTX", address: "0xa00744882684c3e4747faefd68d283ea44099d03" },
  wanchain: { ticker: "WAN", address: "0xdabd997ae5e4799be47d6e69d9431615cba28f48" },
  xdai: { ticker: "GNO", address: "0x9c58bacc331c9aa871afd802db6379a98e80cedb" },
  polygon: { ticker: "matic", address: "0x0000000000000000000000000000000000001010" },
  // avax: { ticker: "AVAX", address: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7" },
  aurora: { ticker: "AURORA", address: "0x8bec47865ade3b172a928df8f990bc7f2a3b9f79" },
  loopring: { ticker: "LRC", address: "0xbbbbca6a901c926f240b89eacb641d8aec7aeafd" },
  immutablex: { ticker: "IMX", address: "0xf57e7e7c23978c3caec3c3548e3d615c346e79ff" },

  // ethereum: { ticker: "ETH", address: "0x0000000000000000000000000000000000000000" },
  // solana: { ticker: "SOL", address: "" },
  // cronos: { ticker: "CRO", address: "0x0000000000000000000000000000000000000000" },
  // kava: { ticker: "KAVA", address: "0x0000000000000000000000000000000000000000" },
  // bsc: { ticker: "BNB", address: "0x0000000000000000000000000000000000000000" },
  // tron: { ticker: "TRON", address: "0x0000000000000000000000000000000000000000" },
  manta: { ticker: "MANTA", address: "0x95cef13441be50d20ca4558cc0a27b601ac544e5" },
  // zklink: { ticker: "ZKLINK", address: "0x0000000000000000000000000000000000000000" },
  // rss3_vsl: { ticker: "RSS3", address: "0x0000000000000000000000000000000000000000" },
  // blast: { ticker: 'BLAST', address: ''}
  // mode: { ticker: 'MODE', address: ''}

  // ronin: { ticker: "RON", address: "0x0000000000000000000000000000000000000000" },
  // near: { ticker: "NEAR", address: "0x0000000000000000000000000000000000000000" },
  // pulsechain: { ticker: "PLS", address: "0x0000000000000000000000000000000000000000" },
  // rootstock: { ticker: "", address: "" },
  // stacks: { ticker: "STX", address: "0x0000000000000000000000000000000000000000" },
  // fantom: { ticker: "FTM", address: "0x0000000000000000000000000000000000000000" },
  // thorchain: { ticker: "RUNE", address: "" },
  // filecoin: { ticker: "FIL", address: "0x0000000000000000000000000000000000000000" },
  // degen: { ticker: "DEGEN", address: "0x0000000000000000000000000000000000000000" },
};

export const gasTokens: { [chain: Chain]: string } = {
  bitcoin: "BTC",
  ronin: "RON",
  near: "NEAR",
  pulsechain: "PLS",
  rootstock: "RBTC",
  stacks: "STX",
  fantom: "FTM",
  thorchain: "RUNE",
  filecoin: "FIL",
  degen: "DEGEN",
  mantle: "ETH",
  arbitrum: "ETH",
  nova: "ETH",
  base: "ETH",
  linea: "ETH",
  optimism: "ETH",
  scroll: "ETH",
  starknet: "ETH",
  zksync: "ETH",
  era: "ETH",
  everscale: "EVER",
  injective: "INJ",
  celo: "CELO",
  iotex: "IOTX",
  wanchain: "WAN",
  kekchain: "",
  elysium: "LAVA",
  alephium: "ALPH",
  xdai: "XDAI",
  polygon: "MATIC",
  avax: "AVAX",
  aurora: "ETH",
  rsk: "RBTC",
  solana: "SOL",
  cronos: "CRO",
  kava: "KAVA",
  ethereum: "ETH",
  bsc: "BNB",
  tron: "TRON",
  zklink: "ZKLINK",
  rss3_vsl: "RSS3",
  kinto: "KINTO",
  blast: "ETH",
  mode: "ETH",
};
