import { call } from "@defillama/sdk/build/abi/abi2";
import { Chain } from "@defillama/sdk/build/general";
import { Address } from "@defillama/sdk/build/types";
import fetch from "node-fetch";
import * as zk from "zksync-web3";

let addresses: { [chain: Chain]: Address[] } = {};
export const arbitrum = async (): Promise<Address[]> => {
  if (addresses.arbitrum) return addresses.arbitrum;
  const data = await fetch("https://bridge.arbitrum.io/token-list-42161.json").then((r) => r.json());
  addresses.arbitrum = data.tokens.map((token: any) => token.address.toLowerCase());
  return addresses.arbitrum;
};
export const nova = async (): Promise<Address[]> => {
  if (addresses.nova) return addresses.nova;
  const data = await fetch("https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_uniswap_labs_default.json").then(
    (r) => r.json()
  );
  addresses.nova = data.tokens.map((token: any) => token.address.toLowerCase());
  return addresses.nova;
};
export const mantle = async (): Promise<Address[]> => {
  if (addresses.mantle) return addresses.mantle;
  const data = await fetch(
    "https://raw.githubusercontent.com/mantlenetworkio/mantle-token-lists/main/mantle.tokenlist.json"
  ).then((r) => r.json());
  addresses.mantle = data.tokens.filter((t: any) => t.chainId == 5000).map((t: any) => t.address.toLowerCase());
  return addresses.mantle;
};
export const avax = async (): Promise<Address[]> => {
  if (addresses.avax) return addresses.avax;
  const oldData = await fetch("https://raw.githubusercontent.com/0xngmi/bridge-tokens/main/data/penultimate.json").then(
    (r) => r.json()
  );
  const oldTokens = oldData.map((t: any) => t["Avalanche Token Address"].toLowerCase());
  const newData = await fetch(
    "https://raw.githubusercontent.com/ava-labs/avalanche-bridge-resources/main/avalanche_contract_address.json"
  ).then((r) => r.json());
  const newTokens = Object.values(newData).map((t: any) => t.toLowerCase());
  addresses.avax = [...oldTokens, ...newTokens];
  return addresses.avax;
};
export const base = async (): Promise<Address[]> => {
  if (addresses.base) return addresses.base;
  const data = await fetch("https://static.optimism.io/optimism.tokenlist.json").then((r) => r.json());
  const baseData = data.tokens.filter((t: any) => t.chainId === 8453);
  addresses.base = baseData.map((t: any) => t.address.toLowerCase());
  return addresses.base;
};
export const linea = async (): Promise<Address[]> => {
  if (addresses.linea) return addresses.linea;
  const data = await fetch(
    "https://raw.githubusercontent.com/Consensys/linea-token-list/main/json/linea-mainnet-token-shortlist.json"
  ).then((r) => r.json());
  addresses.linea = data.tokens.map((t: any) => t.address.toLowerCase());
  return addresses.linea;
};
// export const metis = (): Promise<Address[]> => {};
export const optimism = async (): Promise<Address[]> => {
  if (addresses.optimism) return addresses.optimism;
  const data = await fetch("https://static.optimism.io/optimism.tokenlist.json").then((r) => r.json());
  const baseData = data.tokens.filter((t: any) => t.chainId === 10);
  addresses.optimism = baseData.map((t: any) => t.address.toLowerCase());
  return addresses.optimism;
};
export const polygon_zkevm = async (): Promise<Address[]> => {
  if (addresses.polygon_zkevm) return addresses.polygon_zkevm;

  const tokens = [
    "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0", // matic
    "0xdac17f958d2ee523a2206206994597c13d831ec7", // usdt
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // usdc
    "0x6b175474e89094c44da98b954eedeac495271d0f", // dai
    "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", // wbtc
  ];

  addresses.polygon_zkevm = [];
  await Promise.all(
    tokens.map(async (token) => {
      const [name, symbol, decimals] = await Promise.all(
        ["string:name", "string:symbol", "uint8:decimals"].map((abi) => call({ abi, target: token }))
      );
      const wrapperAddress = await call({
        target: "0x2a3dd3eb832af982ec71669e178424b10dca2ede",
        abi: "function precalculatedWrapperAddress(uint32 originNetwork,address originTokenAddress,string calldata name,string calldata symbol,uint8 decimals) external view returns (address)",
        params: [0, token, name, symbol, decimals],
        chain: "polygon_zkevm",
      });
      if (wrapperAddress) addresses.polygon_zkevm.push(wrapperAddress.toLowerCase());
    })
  );

  return addresses.polygon_zkevm;
};
export const scroll = async (): Promise<Address[]> => {
  if (addresses.scroll) return addresses.scroll;
  const data = await fetch("https://scroll-tech.github.io/token-list/scroll.tokenlist.json").then((r) => r.json());
  const baseData = data.tokens.filter((t: any) => t.chainId === 534352);
  addresses.scroll = baseData.map((t: any) => t.address.toLowerCase());
  return addresses.scroll;
};
export const starknet = async (): Promise<Address[]> => {
  if (addresses.starknet) return addresses.starknet;
  const data = await fetch(
    "https://raw.githubusercontent.com/starknet-io/starknet-addresses/master/bridged_tokens/mainnet.json"
  ).then((r) => r.json());
  addresses.starknet = data.map((t: any) => t.l2_token_address.toLowerCase());
  return addresses.starknet;
};
export const zksync = async (): Promise<Address[]> => {
  if (addresses.zksync) return addresses.zksync;
  const provider = new zk.Provider("https://mainnet.era.zksync.io");
  const data = await provider.getConfirmedTokens();
  addresses.zksync = data.map((d: any) => d.l2Address.toLowerCase());
  return addresses.zksync;
};
