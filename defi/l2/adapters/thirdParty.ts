import { Chain } from "@defillama/sdk/build/general";
import { Address } from "@defillama/sdk/build/types";
import { canonicalBridgeIds, mixedCaseChains } from "../constants";
import fetch from "node-fetch";
import { additional, excluded } from "./manual";
import axios from "axios";

let bridgePromises: { [bridge: string]: Promise<any> } = {};
const chains = Object.values(canonicalBridgeIds);
const addresses: { [chain: Chain]: Address[] } = {};
chains.map((c: string) => (addresses[c] = []));
let doneAdapters: string[] = [];
let mappingDone: boolean = false;
const chainMap: { [chain: string]: string } = {
  binance: "bsc",
  avalanche: "avax",
};

const axelar = async (): Promise<void> => {
  const bridge = "axelar";
  if (!(bridge in bridgePromises))
    bridgePromises[bridge] = fetch("https://api.axelarscan.io/?method=getAssets").then((r) => r.json());
  const data = await bridgePromises[bridge];
  if (doneAdapters.includes(bridge)) return;
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
  doneAdapters.push(bridge);
};

const wormhole = async (): Promise<void> => {
  const bridge = "wormhole";

  if (!(bridge in bridgePromises))
    bridgePromises[bridge] = axios.get(
      "https://raw.githubusercontent.com/wormhole-foundation/wormhole-token-list/main/content/by_dest.csv"
    );

  const data = (await bridgePromises[bridge]).data;
  if (doneAdapters.includes(bridge)) return;
  const chainMap: { [ticker: string]: string } = {
    sol: "solana",
    eth: "ethereum",
    matic: "polygon",
    bsc: "bsc",
    avax: "avax",
    oasis: "oasis",
    algorand: "algorand",
    ftm: "fantom",
    aurora: "aurora",
    celo: "celo",
    moonbeam: "moonbeam",
    injective: "injective",
    optimism: "optimism",
    arbitrum: "arbitrum",
    aptos: "aptos",
    base: "base",
  };

  const lines = data.split("\n");
  lines.shift();
  lines.map((l: string) => {
    const rows = l.split(",");
    if (!(rows[0] in chainMap)) return;
    const chain = chainMap[rows[0]];
    if (!addresses[chain]) addresses[chain] = [];
    addresses[chain].push(rows[3]);
  });
  doneAdapters.push(bridge);
};

const adapters = [axelar(), wormhole()];
const tokenAddresses = async (): Promise<{ [chain: Chain]: Address[] }> => {
  await Promise.all(adapters);
  const filteredAddresses: { [chain: Chain]: Address[] } = {};
  if (adapters.length == doneAdapters.length && mappingDone) return filteredAddresses;

  Object.keys(addresses).map((chain: string) => {
    let chainAddresses =
      chain in excluded ? addresses[chain].filter((t: string) => !excluded[chain].includes(t)) : addresses[chain];
    if (!mixedCaseChains.includes(chain)) chainAddresses = chainAddresses.map((t: string) => t.toLowerCase());
    if (!(chain in additional)) {
      filteredAddresses[chain] = chainAddresses;
      return;
    }
    const additionalTokens = mixedCaseChains.includes(chain)
      ? additional[chain]
      : additional[chain].map((t: string) => t.toLowerCase());
    filteredAddresses[chain] = [...chainAddresses, ...additionalTokens];
  });

  mappingDone = true;
  return filteredAddresses;
};

export default tokenAddresses;

// layerzero
// gravity bridge
// pNetwork
