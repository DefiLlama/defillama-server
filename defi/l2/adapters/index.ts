import { call } from "@defillama/sdk/build/abi/abi2";
import { Chain } from "@defillama/sdk/build/general";
import { Address } from "@defillama/sdk/build/types";
import axios from "axios";
import fetch from "node-fetch";

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
export const metis = async (): Promise<Address[]> => {
  return [
    "0x0000000000000000000000000000000000000000", // METIS
    "0x420000000000000000000000000000000000000A", // ETH
    "0x433E43047B95cB83517abd7c9978Bdf7005E9938", // WBTC
    "0xEA32A96608495e54156Ae48931A7c20f0dcc1a21", // USDC
    "0xbb06dca3ae6887fabf931640f67cab3e3a16f4dc", // USDT
    "0x0x4c078361FC9BbB78DF910800A991C7c3DD2F6ce0", // DAI
    "0xb809cda0c2f79f43248C32b5DcB09d5cD26BbF10", // BUSD
    "0xd1F0A4E5444EEd0fbcd6624DCef7Ef33043E6168", // AAVE
    "0xf5F66d5daa89c090A7afa10E6C1553B2887a9A33", // LINK
    "0x17Ee7E4dA37B01FC1bcc908fA63DF343F23B4B7C", // SUSHI
    "0x54acd90360cD3915773f2328c653587db79a4323", // SUSHI
    "0xC5cDb08E75595D8c55091cBA9B02960b5782B96E", // UNI
    "0x029a43Aa51D5924D4c18A42EFbC0e0A84ECc355C", // CRV
    "0x5CE34d9abe4bF239cbc08B89287c87f4CD6d80B7", // WOW
  ];
};
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
  addresses.starknet = data.map((t: any) => t.l2_token_address?.toLowerCase()).filter((t: any) => t != null);
  return addresses.starknet;
};
export const zksync = async (): Promise<Address[]> => {
  if (addresses.zksync) return addresses.zksync;
  const {
    data: { result: data },
  } = await axios.post("https://mainnet.era.zksync.io", {
    method: "zks_getConfirmedTokens",
    params: [0, 255],
    id: 1,
    jsonrpc: "2.0",
  });
  addresses.zksync = data.map((d: any) => d.l2Address.toLowerCase());
  return addresses.zksync;
};
export const tron = async (): Promise<Address[]> => {
  if (!("tron" in addresses)) addresses.tron = [];
  addresses.tron.push(
    ...[
      "TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9", // BTC
      "THb4CqiFdwNHsWsQCs4JhzwjMWys4aqCbF", // ETHold
      "TR3DLthpnDdCGabhVDbD3VMsiJoCXY3bZd", // LTC
      "THbVQp8kMjStKNnf2iCY6NEzThKMK5aBHg", // DOGE
    ]
  );
  return addresses.tron;
};
export const blast = async (): Promise<Address[]> => {
  if (!("blast" in addresses)) addresses.blast = [];
  addresses.blast.push(
    ...[
      "0x4300000000000000000000000000000000000004", // WETH
    ]
  );
  return addresses.blast;
};
export const mode = async (): Promise<Address[]> => {
  if (!("mode" in addresses)) addresses.mode = [];
  addresses.mode.push(
    ...[
      "0x4300000000000000000000000000000000000004", // WETH
      "0xcDd475325D6F564d27247D1DddBb0DAc6fA0a5CF", // WBTC
      "0xd988097fb8612cc24eeC14542bC03424c656005f", // USDC
      "0xf0F161fDA2712DB8b566946122a5af183995e2eD", // USDT
    ]
  );
  return addresses.mode;
};
export const zklink = async (): Promise<Address[]> => {
  if (addresses.zklink) return addresses.zklink;
  const allTokens = [];
  let page = 1;
  do {
    const { items, meta } = await fetch(`https://explorer-api.zklink.io/tokens?limit=200&page=${page}&key=`).then((r) =>
      r.json()
    );
    allTokens.push(...items);
    page++;
    if (page >= meta.totalPages) break;
  } while (page < 100);
  addresses.zklink = allTokens.map((d: any) => d.l2Address.toLowerCase());
  return addresses.zklink;
};
export const manta = async (): Promise<Address[]> => {
  if (addresses.manta) return addresses.manta;
  const bridge = (
    await fetch(
      "https://raw.githubusercontent.com/Manta-Network/manta-pacific-token-list/main/json/manta-pacific-mainnet-token-list.json"
    ).then((r) => r.json())
  ).tokens as any[];

  addresses.manta = bridge
    .filter((token) => token.chainId === 169 && token.tokenType.includes("canonical-bridge"))
    .map((optToken) => optToken.address.toLowerCase());
  return addresses.manta;
};
