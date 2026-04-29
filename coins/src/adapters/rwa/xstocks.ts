import { getLogs } from "../../utils/cache/getLogs";
import {
  addToDBWritesList,
  getTokenAndRedirectDataMap,
} from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import { calculate4626Prices } from "../utils/erc4626";
import { fetch } from "../utils";

// Same factory address on every supported EVM chain.
// Emits NewToken(address, string, string) when an xStocks token is deployed.
const FACTORY = "0x9768D3956a850913fb74594eBf40DFf9b5b576F3";
const factoryFromBlock: { [chain: string]: number } = {
  ethereum: 22229268, // 2025-04-09
  arbitrum: 324307540, // 2025-04-08
  ink: 35332980, // 2026-01-19
  mantle: 87973839, // 2025-11-25
  // Factory is deployed on these chains but no xStocks have been deployed yet 
  // base: 28693404,    // 2025-04-09
  // polygon: 70076037, // 2025-04-09
  // avax: 59937223,    // 2025-04-09
};

const NEW_TOKEN_EVENT =
  "event NewToken(address indexed newToken, string name, string symbol)";

async function discoverChainTokens(chain: string, timestamp: number) {
  const api = await getApi(chain, timestamp);
  const logs = await getLogs({
    api,
    target: FACTORY,
    fromBlock: factoryFromBlock[chain],
    eventAbi: NEW_TOKEN_EVENT,
    onlyArgs: true,
  });
  return logs.map((l: any) => ({ address: l.newToken, symbol: l.symbol }));
}

async function getTokenPrices(timestamp: number) {
  const writes: Write[] = [];
  const chains = Object.keys(factoryFromBlock);

  // Get all tokens across chains and group by address to identify the same token (CREATE2)
  const byAddress: {
    [address: string]: { symbol: string; chains: string[] };
  } = {};
  await Promise.all(
    chains.map(async (chain) => {
      const tokens = await discoverChainTokens(chain, timestamp);
      for (const t of tokens) {
        const key = t.address.toLowerCase();
        byAddress[key] ??= { symbol: t.symbol, chains: [] };
        byAddress[key].chains.push(chain);
      }
    }),
  );

  // Get prices per chain
  const pricesByChain: { [chain: string]: any } = {};
  await Promise.all(
    chains.map(async (chain) => {
      const addresses = Object.entries(byAddress)
        .filter(([, v]) => v.chains.includes(chain))
        .map(([addr]) => addr);
      pricesByChain[chain] = await getTokenAndRedirectDataMap(
        addresses,
        chain,
        timestamp,
      );
    }),
  );

  // Identify chains that are already priced, then fan prices to the unpriced chains. 
  // We never overwrite an existing price and we skip tokens with no prices
  for (const [address, { symbol, chains: tokenChains }] of Object.entries(
    byAddress,
  )) {
    const pricedChains = tokenChains.filter(
      (c) =>
        typeof pricesByChain[c]?.[address]?.price === "number" &&
        isFinite(pricesByChain[c][address].price),
    );
    if (pricedChains.length === 0) continue;

    const price = pricesByChain[pricedChains[0]][address].price;
    for (const chain of tokenChains) {
      if (pricedChains.includes(chain)) continue;
      addToDBWritesList(
        writes,
        chain,
        address,
        price,
        18,
        symbol,
        timestamp,
        "xstocks",
        0.95,
      );
    }
  }

  return writes;
}

export function xstocks(timestamp: number = 0) {
  return getTokenPrices(timestamp);
}

// Wrapped xStocks are ERC-4626 vaults around the rebasing xStock — both V1 and V2 wrappers.
const TOKENS_API = "https://api.backed.fi/api/v1/token?type=xstocks";

const networkToChain: { [network: string]: string } = {
  Ethereum: "ethereum",
  Polygon: "polygon",
  Gnosis: "xdai",
  BinanceSmartChain: "bsc",
  Arbitrum: "arbitrum",
  Avalanche: "avax",
  Fantom: "fantom",
  Base: "base",
  Sonic: "sonic",
  Mantle: "mantle",
  HyperEVM: "hyperliquid",
  Ink: "ink",
};

export async function wrappedXstocks(timestamp: number = 0) {
  const res = await fetch(TOKENS_API);
  const nodes: any[] = res?.nodes ?? [];

  const wrappersByChain: { [chain: string]: Set<string> } = {};
  for (const token of nodes) {
    for (const d of token.deployments ?? []) {
      const chain = networkToChain[d.network];
      if (!chain) continue;
      for (const w of [d.wrapperAddress, d.wrapperAddressV2]) {
        if (typeof w !== "string" || !w.startsWith("0x")) continue;
        wrappersByChain[chain] ??= new Set();
        wrappersByChain[chain].add(w.toLowerCase());
      }
    }
  }

  const results = await Promise.all(
    Object.entries(wrappersByChain).map(([chain, addrs]) =>
      calculate4626Prices(chain, timestamp, [...addrs], "xstocks"),
    ),
  );
  return results.flat();
}
