import type { PlatformAdapter, FundingEntry, ParsedPerpsMarket } from "./types";
import { safeFloat, pctChange } from "./types";

// Ostium — Arbitrum
// Docs: https://ostium-labs.gitbook.io/ostium-docs/developer/api-and-sdk
// RWA assets: 14 (7 equities, 3 indices, 2 precious metals, 1 oil, 1 industrial metals)
// Margin: USDC | Oracle: Stork + QUODD

export const OSTIUM_MAKER_FEE = 0.0006;
export const OSTIUM_TAKER_FEE = 0.001;

const OSTIUM_METADATA_API = "https://metadata-backend.ostium.io";

// ---------------------------------------------------------------------------
// Raw API types
// ---------------------------------------------------------------------------

interface OstiumPair {
  pairIndex: number;
  name: string;
  from: string;
  to: string;
  groupIndex: number;
  maxLeverage?: number;
  openInterestLong?: string | number;
  openInterestShort?: string | number;
}

interface OstiumMarketData {
  pairIndex: number;
  price?: string | number;
  fundingRate?: string | number;
  openInterestLong?: string | number;
  openInterestShort?: string | number;
  volume24h?: string | number;
  priceChange24h?: string | number;
  prevDayPrice?: string | number;
  maxLeverage?: number;
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

async function fetchOstiumPairs(): Promise<OstiumPair[] | null> {
  try {
    const res = await fetch(`${OSTIUM_METADATA_API}/pairs`);
    if (!res.ok) {
      console.error(`Ostium pairs API ${res.status}: ${res.statusText}`);
      return null;
    }
    const data = await res.json();
    return Array.isArray(data) ? data : data?.pairs ?? null;
  } catch (e) {
    console.error("Ostium fetchPairs error:", e);
    return null;
  }
}

async function fetchOstiumMarketData(): Promise<OstiumMarketData[] | null> {
  try {
    const res = await fetch(`${OSTIUM_METADATA_API}/markets`);
    if (!res.ok) {
      console.error(`Ostium markets API ${res.status}: ${res.statusText}`);
      return null;
    }
    const data = await res.json();
    return Array.isArray(data) ? data : data?.markets ?? null;
  } catch (e) {
    console.error("Ostium fetchMarketData error:", e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function parseOstiumMarkets(
  pairs: OstiumPair[],
  marketData: OstiumMarketData[] | null,
): ParsedPerpsMarket[] {
  const dataByIndex = new Map<number, OstiumMarketData>();
  if (marketData) {
    for (const md of marketData) {
      dataByIndex.set(md.pairIndex, md);
    }
  }

  const markets: ParsedPerpsMarket[] = [];

  for (const pair of pairs) {
    const md = dataByIndex.get(pair.pairIndex);
    const contract = `ostium:${pair.from}-${pair.to}`;

    const oiLong = safeFloat(md?.openInterestLong ?? pair.openInterestLong);
    const oiShort = safeFloat(md?.openInterestShort ?? pair.openInterestShort);
    const openInterest = oiLong + oiShort;

    const price = safeFloat(md?.price);
    const prevDayPx = safeFloat(md?.prevDayPrice);

    markets.push({
      contract,
      venue: "ostium",
      platform: "ostium",
      openInterest,
      volume24h: safeFloat(md?.volume24h),
      markPx: price,
      oraclePx: price,
      midPx: price,
      prevDayPx,
      priceChange24h: md?.priceChange24h != null ? safeFloat(md.priceChange24h) : pctChange(price, prevDayPx),
      fundingRate: safeFloat(md?.fundingRate),
      premium: 0,
      maxLeverage: md?.maxLeverage ?? pair.maxLeverage ?? 0,
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
  oiIsNotional: true, // Ostium OI is USD notional
  async fetchMarkets(): Promise<ParsedPerpsMarket[]> {
    const [pairs, marketData] = await Promise.all([
      fetchOstiumPairs(),
      fetchOstiumMarketData(),
    ]);
    if (!pairs || pairs.length === 0) return [];
    return parseOstiumMarkets(pairs, marketData);
  },
  async fetchFundingHistory(): Promise<FundingEntry[]> {
    // Ostium uses adaptive funding derived from OI imbalance.
    // No public funding history endpoint currently documented.
    return [];
  },
};
