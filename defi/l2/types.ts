import BigNumber from "bignumber.js";
import { Address, LogArray } from "@defillama/sdk/build/types";
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
  [chain: Chain]: { [asset: string]: BigNumber };
};
