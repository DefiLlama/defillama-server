import { Chain } from "@defillama/sdk/build/general";
import { Address } from "@defillama/sdk/build/types";
import { canonicalBridgeIds } from "../constants";
import fetch from "node-fetch";

let bridgePromises: { [bridge: string]: Promise<any> } = {};
const chains = Object.values(canonicalBridgeIds);
const addresses: { [chain: Chain]: Address[] } = {};
chains.map((c: string) => (addresses[c] = []));

const tokenAddresses = async (): Promise<{ [chain: Chain]: Address[] }> => {
  await Promise.all([axelar(), wormhole()]);
  return addresses;
};

const chainMap: { [chain: string]: string } = {
  binance: "bsc",
  avalanche: "avax",
};

const axelar = async (): Promise<void> => {
  if (!("axelar" in bridgePromises))
    bridgePromises.axelar = fetch("https://api.axelarscan.io/?method=getAssets").then((r) => r.json());
  const data = await bridgePromises.axelar;
  data.map((token: any) => {
    if (!token.addresses) return;
    Object.keys(token.addresses).map((chain: string) => {
      let normalizedChain: string = chain;
      if (chain in chainMap) normalizedChain = chainMap[chain];
      if (!chains.includes(normalizedChain)) return;
      if (!("address" in token.addresses[chain])) return;
      addresses[normalizedChain].push(token.addresses[chain].address.toLowerCase());
    });
  });
};

// CHECK THIS IS WORKING
const wormhole = async (): Promise<void> => {
  const tokenlist = await fetch(
    "https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json"
  ).then((r) => r.json());
  const tokens = tokenlist.tokens.filter(
    (t: any) =>
      "tags" in t && (t.tags.includes("wrapped") || t.tags.includes("stablecoin") || t.tags.includes("ethereum"))
  );
  addresses.solana = tokens.map((t: any) => t.address);
};

export default tokenAddresses;

// layerzero
// gravity bridge
// pNetwork
