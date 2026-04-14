import type { PlatformAdapter, FundingEntry, ParsedPerpsMarket } from "./types";
import { safeFloat } from "./types";

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
  try {
    const res = await fetch(`${OSTIUM_API}/PricePublish/latest-prices`);
    if (!res.ok) return new Map();
    const data: OstiumPrice[] = await res.json();
    const map = new Map<string, OstiumPrice>();
    for (const p of data) {
      map.set(`${p.from}${p.to}`, p);
    }
    return map;
  } catch (e) {
    console.error("Ostium fetchPrices error:", e);
    return new Map();
  }
}

async function fetchOstiumPairs(): Promise<OstiumSubgraphPair[]> {
  const query = `{
    pairs(first: 100) {
      id from to longOI shortOI maxOI maxLeverage lastTradePrice makerFeeP takerFeeP
      group { name maxLeverage }
    }
  }`;
  try {
    const res = await fetch(OSTIUM_GRAPH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) {
      console.error(`Ostium subgraph ${res.status}: ${res.statusText}`);
      return [];
    }
    const json = await res.json();
    return json?.data?.pairs ?? [];
  } catch (e) {
    console.error("Ostium fetchPairs error:", e);
    return [];
  }
}

async function fetchOstiumVolumes(): Promise<Map<string, number>> {
  try {
    const res = await fetch(`${OSTIUM_API}/volume/all`);
    if (!res.ok) return new Map();
    const json = await res.json();
    const entries: OstiumVolumeEntry[] = json?.data ?? [];
    const map = new Map<string, number>();
    for (const e of entries) {
      map.set(e.pair_id, e.last_24h_volume);
    }
    return map;
  } catch (e) {
    console.error("Ostium fetchVolumes error:", e);
    return new Map();
  }
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function parseOstiumMarkets(
  pairs: OstiumSubgraphPair[],
  prices: Map<string, OstiumPrice>,
  volumes: Map<string, number>,
): ParsedPerpsMarket[] {
  const markets: ParsedPerpsMarket[] = [];

  for (const pair of pairs) {
    // Skip crypto pairs
    if (pair.group && CRYPTO_GROUPS.test(pair.group.name)) continue;

    const contract = `ostium:${pair.from}-${pair.to}`;

    // OI from subgraph is in 1e18 precision (USDC-denominated with 18 decimal scaling)
    const longOI = safeFloat(pair.longOI) / 1e18;
    const shortOI = safeFloat(pair.shortOI) / 1e18;
    const openInterest = longOI + shortOI;

    // Price: prefer live price feed, fall back to subgraph lastTradePrice
    const priceKey = `${pair.from}${pair.to}`;
    const livePrice = prices.get(priceKey);
    const price = livePrice?.mid ?? safeFloat(pair.lastTradePrice);

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
      // Pair-level maxLeverage is 0 in subgraph; use group maxLeverage / 100
      maxLeverage: safeFloat(pair.maxLeverage) || safeFloat(pair.group?.maxLeverage) / 100,
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
    const [pairs, prices, volumes] = await Promise.all([
      fetchOstiumPairs(),
      fetchOstiumPrices(),
      fetchOstiumVolumes(),
    ]);
    if (pairs.length === 0) return [];
    return parseOstiumMarkets(pairs, prices, volumes);
  },
  async fetchFundingHistory(): Promise<FundingEntry[]> {
    return [];
  },
};
