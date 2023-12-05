import BigNumber from "bignumber.js";
import { Address } from "@defillama/sdk/build/types";
import { Chain } from "@defillama/sdk/build/general";

export type Supplies = { [token: string]: number };
export type DollarValues = { [asset: string]: BigNumber };
export type OwnerInsert = {
  chain: string;
  token: Address;
  holder: Address;
  amount: number;
  timestamp?: number;
};
export type DeployerInsert = {
  token: Address;
  deployer: Address;
  chain: string;
};
export type TokenInsert = {
  token: Address;
  chain: Chain;
};
export type SupplyInsert = {
  token: Address;
  chain: Chain;
  supply: number;
};
export type TokenTvlData = {
  [chain: Chain]: DollarValues;
};
export type CoinsApiData = {
  decimals: number;
  price: number;
  symbol: string;
  timestamp: number;
  PK?: string;
};
export type TranslatedChainData = {
  canonical: DollarValues;
  incoming: DollarValues;
  outgoing: DollarValues;
  native: DollarValues;
  // metadata: any;
};
export type ChainData = {
  canonical: TokenTvlData;
  incoming: TokenTvlData;
  outgoing: TokenTvlData;
  native: TokenTvlData;
  ownTokens: TokenTvlData;
  // metadata: any;
};
export type McapData = {
  [symbol: string]: {
    native: BigNumber;
    outgoing?: BigNumber;
    supply: number;
    total: BigNumber;
    chain: Chain;
  };
};
