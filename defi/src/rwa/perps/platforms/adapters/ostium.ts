import type { PlatformAdapter, FundingEntry, ParsedPerpsMarket } from "../types";
import { safeFloat, safeFetch } from "../types";

// Ostium — Arbitrum
// Docs: https://ostium-labs.gitbook.io/ostium-docs/developer/api-and-sdk
// Swagger: https://metadata-backend.ostium.io/api
// RWA assets: 14+ (equities, indices, precious metals, oil, industrial metals)
// Margin: USDC | Oracle: Stork + QUODD

export const OSTIUM_MAKER_FEE = 0.0006;
export const OSTIUM_TAKER_FEE = 0.001;

const OSTIUM_API = "https://metadata-backend.ostium.io";

// Subgraph proxy (the metadata backend proxies to the best Ormi Labs subgraph)
const OSTIUM_GRAPH = `${OSTIUM_API}/graph`;

// ---------------------------------------------------------------------------
// Raw API types
// ---------------------------------------------------------------------------

interface OstiumPrice {
  feed_id: string;
  bid: number;
  mid: number;
  ask: number;
  isMarketOpen: boolean;
  from: string;
  to: string;
  timestampSeconds: number;
}

interface OstiumSubgraphPair {
  id: string;
  from: string;
  to: string;
  longOI: string;
  shortOI: string;
  maxOI: string;
  maxLeverage: string;
  lastTradePrice: string;
  makerFeeP: string;
  takerFeeP: string;
  group: { name: string; maxLeverage?: string } | null;
}

interface OstiumVolumeEntry {
  pair_id: string;
  last_24h_volume: number;
}

// Non-RWA groups to exclude
const CRYPTO_GROUPS = /crypto/i;

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

async function fetchOstiumPrices(): Promise<Map<string, OstiumPrice>> {
  const data = await safeFetch<OstiumPrice[]>(`${OSTIUM_API}/PricePublish/latest-prices`, "Ostium fetchPrices");
  if (!data) return new Map();
  const map = new Map<string, OstiumPrice>();
  for (const p of data) {
    map.set(`${p.from}${p.to}`, p);
  }
  return map;
}

async function fetchOstiumPairs(): Promise<OstiumSubgraphPair[]> {
  const query = `{
    pairs(first: 100) {
      id from to longOI shortOI maxOI maxLeverage lastTradePrice makerFeeP takerFeeP
      group { name maxLeverage }
    }
  }`;
  const json = await safeFetch<{ data?: { pairs?: OstiumSubgraphPair[] } }>(OSTIUM_GRAPH, "Ostium subgraph", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return json?.data?.pairs ?? [];
}

async function fetchOstiumVolumes(): Promise<Map<string, number>> {
  const json = await safeFetch<{ data?: OstiumVolumeEntry[] }>(`${OSTIUM_API}/volume/all`, "Ostium fetchVolumes");
  if (!json) return new Map();
  const map = new Map<string, number>();
  for (const e of json.data ?? []) {
    map.set(e.pair_id, e.last_24h_volume);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function parseOstiumMarkets(
  pairs: OstiumSubgraphPair[],
  prices: Map<string, OstiumPrice>,
  volumes: Map<string, number>
): ParsedPerpsMarket[] {
  const markets: ParsedPerpsMarket[] = [];

  for (const pair of pairs) {
    // Skip crypto pairs
    if (pair.group && CRYPTO_GROUPS.test(pair.group.name)) continue;

    const contract = `ostium:${pair.from}-${pair.to}`;

    // Price: prefer live price feed, fall back to subgraph lastTradePrice (1e18 precision)
    const priceKey = `${pair.from}${pair.to}`;
    const livePrice = prices.get(priceKey);
    const price = livePrice?.mid ?? safeFloat(pair.lastTradePrice) / 1e18;

    // OI from subgraph is in BASE ASSET UNITS with 1e18 precision (not USDC).
    // e.g., XAU longOI = 3.5e21 means 3,517 oz of gold. Multiply by price for USD.
    const longOI = safeFloat(pair.longOI) / 1e18;
    const shortOI = safeFloat(pair.shortOI) / 1e18;
    const openInterest = (longOI + shortOI) * price;

    // Volume: pair.id from subgraph is the pair index
    const volume24h = volumes.get(pair.id) ?? 0;

    markets.push({
      contract,
      venue: "ostium",
      platform: "ostium",
      openInterest,
      volume24h,
      markPx: price,
      oraclePx: price,
      midPx: livePrice?.mid ?? price,
      prevDayPx: 0,
      priceChange24h: 0,
      fundingRate: 0, // Ostium adaptive funding — not a simple rate
      premium: 0,
      // Both pair.maxLeverage and group.maxLeverage are stored ×100
      // (e.g., 5000 = 50×, 10000 = 100×). Pair overrides group when non-zero.
      maxLeverage: (safeFloat(pair.maxLeverage) || safeFloat(pair.group?.maxLeverage)) / 100,
      szDecimals: 0,
    });
  }

  return markets;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export const ostiumAdapter: PlatformAdapter = {
  name: "ostium",
  oiIsNotional: true,
  async fetchMarkets(): Promise<ParsedPerpsMarket[]> {
    const [pairs, prices, volumes] = await Promise.all([fetchOstiumPairs(), fetchOstiumPrices(), fetchOstiumVolumes()]);
    if (pairs.length === 0) return [];
    return parseOstiumMarkets(pairs, prices, volumes);
  },
  async fetchFundingHistory(): Promise<FundingEntry[]> {
    return [];
  },
};
