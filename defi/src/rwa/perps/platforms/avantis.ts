import type { PlatformAdapter, FundingEntry, ParsedPerpsMarket } from "./types";
import { safeFloat } from "./types";

// Avantis — Base
// Docs: https://sdk.avantisfi.com/introduction.html
// API: https://api.avantisfi.com/v1
// RWA assets: 14 (8 equities, 2 indices, 2 precious metals, 2 oil)
// Margin: USDC | Oracle: Pyth

export const AVANTIS_MAKER_FEE = 0.0006;
export const AVANTIS_TAKER_FEE = 0.0008;

const AVANTIS_API = "https://api.avantisfi.com/v1";

// ---------------------------------------------------------------------------
// Raw API types
// ---------------------------------------------------------------------------

interface AvantisOISnapshot {
  date: string;
  openInterest: number;
  pairIndex?: number;
  pair?: string;
  from?: string;
  to?: string;
}

interface AvantisDailyVolume {
  date: string;
  volume: number;
  pairIndex?: number;
  pair?: string;
  from?: string;
  to?: string;
}

interface AvantisPairInfo {
  pairIndex: number;
  from: string;
  to: string;
  groupIndex: number;
  maxLeverage?: number;
  spreadP?: string;
  price?: string | number;
  openInterest?: string | number;
  openInterestLong?: string | number;
  openInterestShort?: string | number;
  volume24h?: string | number;
  fundingRate?: string | number;
  priceChange24h?: string | number;
}

// RWA group indices in Avantis: 2 = stocks, 3 = indices, 4 = commodities
const RWA_GROUP_INDICES = new Set([2, 3, 4]);

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

async function fetchJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Avantis API ${res.status} for ${url}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error(`Avantis fetch error (${url}):`, e);
    return null;
  }
}

async function fetchAvantisPairs(): Promise<AvantisPairInfo[] | null> {
  const data = await fetchJson(`${AVANTIS_API}/pairs`);
  if (!data) return null;
  const arr = data?.success !== false ? (data?.data ?? data?.pairs ?? data) : null;
  return Array.isArray(arr) ? arr : null;
}

async function fetchAvantisOISnapshots(): Promise<AvantisOISnapshot[] | null> {
  const data = await fetchJson(`${AVANTIS_API}/cached/history/analytics/open-interest-snapshot/1`);
  if (!data) return null;
  const history = data?.data ?? data?.history ?? data;
  return Array.isArray(history) ? history : null;
}

async function fetchAvantisDailyVolumes(): Promise<AvantisDailyVolume[] | null> {
  const data = await fetchJson(`${AVANTIS_API}/history/analytics/daily-volumes/1`);
  if (!data) return null;
  const history = data?.data ?? data?.history ?? data;
  return Array.isArray(history) ? history : null;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function parseAvantisMarkets(
  pairs: AvantisPairInfo[],
  oiSnapshots: AvantisOISnapshot[] | null,
  dailyVolumes: AvantisDailyVolume[] | null,
): ParsedPerpsMarket[] {
  // Build lookup maps by pairIndex or pair name
  const oiByPair = new Map<number, number>();
  if (oiSnapshots) {
    for (const snap of oiSnapshots) {
      if (snap.pairIndex != null) {
        oiByPair.set(snap.pairIndex, (oiByPair.get(snap.pairIndex) ?? 0) + safeFloat(snap.openInterest));
      }
    }
  }

  const volByPair = new Map<number, number>();
  if (dailyVolumes) {
    for (const vol of dailyVolumes) {
      if (vol.pairIndex != null) {
        volByPair.set(vol.pairIndex, (volByPair.get(vol.pairIndex) ?? 0) + safeFloat(vol.volume));
      }
    }
  }

  const markets: ParsedPerpsMarket[] = [];

  for (const pair of pairs) {
    if (!RWA_GROUP_INDICES.has(pair.groupIndex)) continue;

    const contract = `avantis:${pair.from}-${pair.to}`;
    const price = safeFloat(pair.price);

    const oiFromPair = safeFloat(pair.openInterestLong) + safeFloat(pair.openInterestShort);
    const openInterest = oiFromPair > 0 ? oiFromPair : safeFloat(pair.openInterest) || (oiByPair.get(pair.pairIndex) ?? 0);

    const volume24h = safeFloat(pair.volume24h) || (volByPair.get(pair.pairIndex) ?? 0);

    markets.push({
      contract,
      venue: "avantis",
      platform: "avantis",
      openInterest,
      volume24h,
      markPx: price,
      oraclePx: price,
      midPx: price,
      prevDayPx: 0,
      priceChange24h: safeFloat(pair.priceChange24h),
      fundingRate: safeFloat(pair.fundingRate),
      premium: 0,
      maxLeverage: pair.maxLeverage ?? 0,
      szDecimals: 0,
    });
  }

  return markets;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export const avantisAdapter: PlatformAdapter = {
  name: "avantis",
  oiIsNotional: true,
  async fetchMarkets(): Promise<ParsedPerpsMarket[]> {
    const [pairs, oiSnapshots, dailyVolumes] = await Promise.all([
      fetchAvantisPairs(),
      fetchAvantisOISnapshots(),
      fetchAvantisDailyVolumes(),
    ]);
    if (!pairs || pairs.length === 0) return [];
    return parseAvantisMarkets(pairs, oiSnapshots, dailyVolumes);
  },
  async fetchFundingHistory(): Promise<FundingEntry[]> {
    // Avantis uses a dynamic spread model; no traditional funding rate history API.
    return [];
  },
};
