import { Chain } from "@defillama/sdk/build/general";
import providers from "@defillama/sdk/build/providers.json";
import { Address } from "@defillama/sdk/build/types";
import { allChainKeys } from "../constants";
import { bridgedTvlMixedCaseChains } from "../../src/utils/shared/constants";
import fetch from "node-fetch";
import { additional, excluded } from "./manual";
import axios from "axios";

let bridgePromises: { [bridge: string]: Promise<any> } = {};
const addresses: { [chain: Chain]: Address[] } = {};
allChainKeys.map((c: string) => (addresses[c] = []));
let doneAdapters: string[] = [];
let mappingDone: boolean = false;

const chainMap: { [chain: string]: string } = {
  binance: "bsc",
  avalanche: "avax",
};

const chainIdMap: { [id: number]: string } = {};
Object.keys(providers).map((c: string) => {
  chainIdMap[providers[c as keyof typeof providers].chainId] = c;
});

const hyperlane = async (): Promise<void> => {
  const bridge = "hyperlane";
  if (doneAdapters.includes(bridge)) return;
  if (!(bridge in bridgePromises))
    bridgePromises[bridge] = fetch(
      "https://raw.githubusercontent.com/Eclipse-Laboratories-Inc/gist/refs/heads/main/hyperlane-assets.json"
    ).then((r) => r.json());
  const data = await bridgePromises[bridge];
  if (!addresses.eclipse) addresses.eclipse = [];
  data.map(({ address }: any) => addresses.eclipse.push(address));
  doneAdapters.push(bridge);
};

const axelar = async (): Promise<void> => {
  const bridge = "axelar";
  if (doneAdapters.includes(bridge)) return;
  if (!(bridge in bridgePromises))
    bridgePromises[bridge] = fetch("https://api.axelarscan.io/api/getAssets").then((r) => r.json());
  const data = await bridgePromises[bridge];
  data.map((token: any) => {
    if (!token.addresses) return;
    Object.keys(token.addresses).map((chain: string) => {
      let normalizedChain: string = chain;
      if (chain in chainMap) normalizedChain = chainMap[chain];
      if (!allChainKeys.includes(normalizedChain)) return;
      if (!("address" in token.addresses[chain])) return;
      addresses[normalizedChain].push(token.addresses[chain].address.toLowerCase());
    });
  });
  doneAdapters.push(bridge);
};

const wormhole = async (): Promise<void> => {
  const bridge = "wormhole";

  if (doneAdapters.includes(bridge)) return;
  if (!(bridge in bridgePromises))
    bridgePromises[bridge] = axios.get(
      "https://raw.githubusercontent.com/wormhole-foundation/wormhole-token-list/main/content/by_dest.csv"
    );

  const data = (await bridgePromises[bridge]).data;
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

const celer = async (): Promise<void> => {
  const bridge = "celer";
  if (doneAdapters.includes(bridge)) return;
  if (!(bridge in bridgePromises))
    bridgePromises[bridge] = fetch("https://cbridge-prod2.celer.app/v2/getTransferConfigsForAll").then((r) => r.json());
  const data = await bridgePromises[bridge];
  data.pegged_pair_configs.map((pp: any) => {
    const chain = chainIdMap[pp.org_chain_id];
    let normalizedChain: string = chain;
    if (chain in chainMap) normalizedChain = chainMap[chain];
    if (!allChainKeys.includes(normalizedChain)) return;
    if (!addresses[normalizedChain]) addresses[normalizedChain] = [];
    addresses[normalizedChain].push(pp.pegged_token.token.address.toLowerCase());
  });
  doneAdapters.push(bridge);
};

const layerzero = async (): Promise<void> => {
  const bridge = "layerzero";
  if (doneAdapters.includes(bridge)) return;
  if (!(bridge in bridgePromises))
    bridgePromises[bridge] = fetch(
      "https://gist.githubusercontent.com/vrtnd/02b1125edf1afe2baddbf1027157aa31/raw/5cab2009357b1acb8982e6a80e66b64ab7ea1251/mappings.json"
    ).then((r) => r.json());
  const data = await bridgePromises[bridge];

  data.map(({ to }: any) => {
    const [chain, address] = to.split(":");
    if (!(chain in addresses)) addresses[chain] = [];
    if (!(address in addresses[chain])) addresses[chain].push(address);
  });

  const staticTokens: { [chain: string]: string[] } = {
    morph: ["0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34", "0x7DCC39B4d1C53CB31e1aBc0e358b43987FEF80f7"],
    unichain: [
      "0x2416092f143378750bb29b79eD961ab195CcEea5",
      "0xc3eACf0612346366Db554C991D7858716db09f58",
      "0x7DCC39B4d1C53CB31e1aBc0e358b43987FEF80f7",
    ],
  };

  Object.keys(staticTokens).map((chain: string) => {
    if (!(chain in addresses)) addresses[chain] = [];
    addresses[chain].push(...staticTokens[chain]);
  });

  doneAdapters.push(bridge);
};

const flow = async (): Promise<void> => {
  const bridge = "flow";
  if (doneAdapters.includes(bridge)) return;
  if (!(bridge in bridgePromises))
    bridgePromises[bridge] = fetch(
      "https://raw.githubusercontent.com/onflow/assets/refs/heads/main/tokens/outputs/mainnet/token-list.json"
    ).then((r) => r.json());
  const data = await bridgePromises[bridge];
  data.tokens.map(({ chainId, address, tags }: any) => {
    const chain = chainIdMap[chainId];
    if (!allChainKeys.includes(chain)) return;
    if (!tags.includes("bridged-coin")) return;
    if (!(chain in addresses)) addresses[chain] = [];
    addresses[chain].push(address);
  });

  doneAdapters.push(bridge);
};

const unit = async (): Promise<void> => {
  const bridge = "unit";
  if (doneAdapters.includes(bridge)) return;

  const staticTokens: { [chain: string]: string[] } = {
    hyperliquid: [
      "0x9FDBdA0A5e284c32744D2f17Ee5c74B284993463",
      "0x068f321Fa8Fb9f0D135f290Ef6a3e2813e1c8A29",
      "0x3B4575E689DEd21CAAD31d64C4df1f10F3B2CedF",
      "0xBe6727B535545C67d5cAa73dEa54865B92CF7907",
    ],
  };

  Object.keys(staticTokens).map((chain: string) => {
    if (!(chain in addresses)) addresses[chain] = [];
    addresses[chain].push(...staticTokens[chain]);
  });

  doneAdapters.push(bridge);
};

const adapters = [
  axelar().catch((e) => {
    throw new Error(`Axelar fails with: ${e}`);
  }),
  wormhole().catch((e) => {
    throw new Error(`Wormhole fails with: ${e}`);
  }),
  celer().catch((e) => {
    throw new Error(`Celer fails with: ${e}`);
  }),
  hyperlane().catch((e) => {
    throw new Error(`Hyperlane fails with: ${e}`);
  }),
  layerzero().catch((e) => {
    throw new Error(`Layerzero fails with: ${e}`);
  }),
  flow().catch((e) => {
    throw new Error(`flow fails with: ${e}`);
  }),
  // unit().catch((e) => {
  //   throw new Error(`unit fails with: ${e}`);
  // }),
];
const filteredAddresses: { [chain: Chain]: Address[] } = {};

const tokenAddresses = async (): Promise<{ [chain: Chain]: Address[] }> => {
  await Promise.all(adapters);
  if (adapters.length == doneAdapters.length && mappingDone) return filteredAddresses;

  Object.keys(addresses).map((chain: string) => {
    let chainAddresses =
      chain in excluded ? addresses[chain].filter((t: string) => !excluded[chain].includes(t)) : addresses[chain];
    if (!bridgedTvlMixedCaseChains.includes(chain)) chainAddresses = chainAddresses.map((t: string) => t.toLowerCase());
    if (!(chain in additional)) {
      filteredAddresses[chain] = chainAddresses;
      return;
    }
    const additionalTokens = bridgedTvlMixedCaseChains.includes(chain)
      ? additional[chain]
      : additional[chain].map((t: string) => t.toLowerCase());
    filteredAddresses[chain] = [...chainAddresses, ...additionalTokens];
  });

  mappingDone = true;
  return filteredAddresses;
};

export default tokenAddresses;
