import { Chain } from "@defillama/sdk/build/general";
import BigNumber from "bignumber.js";
import { ChainData } from "./types";

export const zero = BigNumber(0);
export const excludedTvlKeys = ["PK", "SK", "tvl"];

export const canonicalBridgeIds: { [chain: string]: Chain } = {
  "3782": "mantle",
  "3777": "arbitrum",
  "3778": "nova",
  "3780": "base",
  "3781": "linea",
  // "3783": "metis", // commented out until we get a native bridge token mapping
  "3784": "optimism",
  // "3785": "polygon_zkevm",
  "3786": "scroll",
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
  "129": "xdai",
  "240": "polygon",
  "3779": "avax",
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
