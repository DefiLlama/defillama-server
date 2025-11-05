type Chain = string;
import providers from "@defillama/sdk/build/providers.json";
type Address = string;
import { allChainKeys } from "../constants";
import { bridgedTvlMixedCaseChains } from "../../src/utils/shared/constants";
import { additional, excluded } from "./manual";
import _ from "lodash";
import { cachedFetch } from "@defillama/sdk/build/util/cache";
import runInPromisePool from "@defillama/sdk/build/util/promisePool";

const addresses: { [chain: Chain]: Address[] } = {};
allChainKeys.map((c: string) => (addresses[c] = []));

const chainMap: { [chain: string]: string } = {
  binance: "bsc",
  avalanche: "avax",
};

const chainIdMap: { [id: number]: string } = {};
Object.keys(providers).map((c: string) => {
  chainIdMap[providers[c as keyof typeof providers].chainId] = c;
});

const hyperlane = async (): Promise<void> => {
  const data = await cachedFetch({
    key: "hyperlane-assets",
    endpoint: "https://raw.githubusercontent.com/Eclipse-Laboratories-Inc/gist/refs/heads/main/hyperlane-assets.json",
  });
  if (Object.keys(data).length == 0) throw new Error("No data or cache found for hyperlane third party");
  if (!addresses.eclipse) addresses.eclipse = [];
  data.map(({ address }: any) => addresses.eclipse.push(address));
};

const axelar = async (): Promise<void> => {
  const data = await cachedFetch({ key: "axelar-assets", endpoint: "https://api.axelarscan.io/api/getAssets" });
  if (Object.keys(data).length == 0) throw new Error("No data or cache found for axelar third party");
  data.map((token: any) => {
    if (!token.addresses) return;
    Object.keys(token.addresses).map((chain: string) => {
      let normalizedChain: string = chain;
      if (chain in chainMap) normalizedChain = chainMap[chain];
      if (!allChainKeys.includes(normalizedChain)) return;
      if (!("address" in token.addresses[chain] && "symbol" in token.addresses[chain])) return;
      if (!token.addresses[chain].symbol.startsWith("axl")) return;
      addresses[normalizedChain].push(token.addresses[chain].address);
    });
  });
};

const wormhole = async (): Promise<void> => {
  const data = await cachedFetch({
    key: "wormhole-token-list",
    endpoint: "https://raw.githubusercontent.com/wormhole-foundation/wormhole-token-list/main/content/by_dest.csv",
  });
  if (data.length == 0) throw new Error("No data or cache found for wormhole third party");

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
};

const celer = async (): Promise<void> => {
  const data = await cachedFetch({
    key: "celer-transfer-configs",
    endpoint: "https://cbridge-prod2.celer.app/v2/getTransferConfigsForAll",
  });
  if (Object.keys(data).length == 0) throw new Error("No data or cache found for celer third party");
  data.pegged_pair_configs.map((pp: any) => {
    const chain = chainIdMap[pp.org_chain_id];
    let normalizedChain: string = chain;
    if (chain in chainMap) normalizedChain = chainMap[chain];
    if (!allChainKeys.includes(normalizedChain)) return;
    if (!addresses[normalizedChain]) addresses[normalizedChain] = [];
    addresses[normalizedChain].push(pp.pegged_token.token.address);
  });
};

const layerzero = async (): Promise<void> => {
  const data = await Promise.all([
    cachedFetch({
      key: "layerzero-mappings",
      endpoint:
        "https://gist.githubusercontent.com/vrtnd/02b1125edf1afe2baddbf1027157aa31/raw/5cab2009357b1acb8982e6a80e66b64ab7ea1251/mappings.json",
    }),
    cachedFetch({ key: "layerzero-metadata", endpoint: "https://metadata.layerzero-api.com/v1/metadata" }),
  ]);
  if (data[0].length == 0 || Object.keys(data[1]).length == 0)
    throw new Error("No data or cache found for layerzero third party");

  data[0].map(({ to }: any) => {
    const [chain, address] = to.split(":");
    if (!(chain in addresses)) addresses[chain] = [];
    if (!(address in addresses[chain])) addresses[chain].push(address);
  });

  const nonEvmMapping: { [key: string]: string } = {
    "solana": "solana",
    "aptos": "aptos",
    "ton": "ton",
    "movement": "move",
    "sui-mainnet": "sui",
  };

  Object.keys(data[1]).map((chain: string) => {
    if (chain.endsWith("-testnet")) return;
    if (!data[1][chain].chainDetails || !data[1][chain].tokens) return;

    const { chainType, chainId, nativeChainId } = data[1][chain].chainDetails;
    if (chainType != "evm" && !nonEvmMapping[chain]) return;
    const destinationChainSlug = chainIdMap[chainId] ?? chainIdMap[nativeChainId] ?? nonEvmMapping[chain];
    if (!destinationChainSlug) return;

    if (!allChainKeys.includes(destinationChainSlug)) return;
    if (!addresses[destinationChainSlug]) addresses[destinationChainSlug] = [];
    const tokens = Object.keys(data[1][chain].tokens).filter(
      (t: string) =>
        addresses[destinationChainSlug].indexOf(t.toLowerCase()) == -1 && !data[1][chain].tokens[t].canonicalAsset
    );
    addresses[destinationChainSlug].push(...tokens);
  });

  const staticTokens: { [chain: string]: string[] } = {
    morph: ["0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34", "0x7dcc39b4d1c53cb31e1abc0e358b43987fef80f7"],
    unichain: [
      "0x2416092f143378750bb29b79ed961ab195cceea5",
      "0xc3eacf0612346366db554c991d7858716db09f58",
      "0x7dcc39b4d1c53cb31e1abc0e358b43987fef80f7",
    ],
  };

  Object.keys(staticTokens).map((chain: string) => {
    if (!(chain in addresses)) addresses[chain] = [];
    addresses[chain].push(...staticTokens[chain]);
  });
};

const flow = async (): Promise<void> => {
  const data = await cachedFetch({
    key: "flow-token-list",
    endpoint: "https://raw.githubusercontent.com/onflow/assets/refs/heads/main/tokens/outputs/mainnet/token-list.json",
  });
  if (Object.keys(data).length == 0) throw new Error("No data or cache found for flow third party");
  data.tokens.map(({ chainId, address, tags }: any) => {
    const chain = chainIdMap[chainId];
    if (!allChainKeys.includes(chain)) return;
    if (!tags.includes("bridged-coin")) return;
    if (!(chain in addresses)) addresses[chain] = [];
    addresses[chain].push(address);
  });
};

const unit = async (): Promise<void> => {
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
};

const adapters = { axelar, wormhole, celer, hyperlane, layerzero, flow, unit };

const filteredAddresses: { [chain: Chain]: Address[] } = {};

const tokenAddresses = _.once(async (): Promise<{ [chain: Chain]: Address[] }> => {
  await runInPromisePool({
    items: Object.entries(adapters),
    concurrency: 5,
    processor: async ([key, adapter]: any) => {
        await adapter().catch((e: any) => {
            throw new Error(`${key} fails with ${e.message}`);
        });
    }})

  // remove excluded assets and add additional assets, normalize case
  Object.keys(addresses).map((chain: string) => {
    let chainAddresses =
      chain in excluded ? addresses[chain].filter((t: string) => !excluded[chain].includes(t)) : addresses[chain];
    if (!bridgedTvlMixedCaseChains.includes(chain)) chainAddresses = chainAddresses.map((t: string) => t.toLowerCase());
    if (!(chain in additional)) {
      filteredAddresses[chain] = [...new Set(chainAddresses)];
      return;
    }
    const additionalTokens = bridgedTvlMixedCaseChains.includes(chain)
      ? additional[chain]
      : additional[chain].map((t: string) => t.toLowerCase());
    filteredAddresses[chain] = [...new Set([...chainAddresses, ...additionalTokens])];
  });

  return filteredAddresses;
});

export default tokenAddresses;
