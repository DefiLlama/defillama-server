import type { PlatformAdapter, FundingEntry, ParsedPerpsMarket } from "../types";
import { safeFloat } from "../types";
export type { ParsedPerpsMarket } from "../types";

// Rates for Hyperliquid HIP-3 venues https://hyperliquid.gitbook.io/hyperliquid-docs/trading/fees
export const HYPERLIQUID_MAKER_FEE = 0.0002;
export const HYPERLIQUID_TAKER_FEE = 0.0005;
export const HYPERLIQUID_DEPLOYER_SHARE = 0.5;

const HYPERLIQUID_API = "https://api.hyperliquid.xyz/info";

export interface HyperliquidAssetCtx {
  dayNtlVlm: string;
  funding: string;
  impactPxs: string[];
  markPx: string;
  midPx: string;
  openInterest: string;
  oraclePx: string;
  premium: string;
  prevDayPx: string;
}

export interface HyperliquidAssetMeta {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  onlyIsolated?: boolean;
}

export interface MetaAndAssetCtxsResponse {
  meta: { universe: HyperliquidAssetMeta[] };
  assetCtxs: HyperliquidAssetCtx[];
}

export interface FundingHistoryEntry {
  coin: string;
  fundingRate: string;
  premium: string;
  time: number;
}

export interface PerpDex {
  name: string;
  index: number;
}

async function postHyperliquid(body: object): Promise<any> {
  const response = await fetch(HYPERLIQUID_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Hyperliquid API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function fetchPerpDexs(): Promise<PerpDex[]> {
  const result = await postHyperliquid({ type: "perpDexs" });
  if (!Array.isArray(result)) {
    console.error("Unexpected perpDexs response:", result);
    return [];
  }
  return result
    .filter((dex: any) => dex != null)
    .map((dex: any, index: number) => ({
      name: typeof dex === "string" ? dex : dex.name ?? String(dex),
      index,
    }));
}

export async function fetchMetaAndAssetCtxs(venue: string): Promise<MetaAndAssetCtxsResponse | null> {
  try {
    const result = await postHyperliquid({
      type: "metaAndAssetCtxs",
      dex: venue,
    });

    if (!result || !Array.isArray(result) || result.length < 2) {
      console.error(`Unexpected metaAndAssetCtxs response for venue ${venue}:`, result);
      return null;
    }

    // Response is [meta, assetCtxs]
    return {
      meta: result[0],
      assetCtxs: result[1],
    };
  } catch (e) {
    console.error(`Failed to fetch metaAndAssetCtxs for venue ${venue}:`, e);
    return null;
  }
}

export async function fetchFundingHistory(
  contract: string,
  startTime: number,
  endTime?: number
): Promise<FundingHistoryEntry[]> {
  try {
    const body: any = {
      type: "fundingHistory",
      coin: contract,
      startTime,
    };
    if (endTime) body.endTime = endTime;

    const result = await postHyperliquid(body);
    if (!Array.isArray(result)) {
      console.error(`Unexpected fundingHistory response for ${contract}:`, result);
      return [];
    }
    return result;
  } catch (e) {
    console.error(`Failed to fetch fundingHistory for ${contract}:`, e);
    return [];
  }
}

const safeParseFloat = safeFloat;

export function parseMetaAndAssetCtxs(response: MetaAndAssetCtxsResponse, venue: string): ParsedPerpsMarket[] {
  const { meta, assetCtxs } = response;
  const markets: ParsedPerpsMarket[] = [];

  const universe = meta?.universe ?? [];
  for (let i = 0; i < universe.length && i < assetCtxs.length; i++) {
    const asset = universe[i];
    const ctx = assetCtxs[i];

    const markPx = safeParseFloat(ctx.markPx);
    const prevDayPx = safeParseFloat(ctx.prevDayPx);
    const priceChange24h = prevDayPx > 0 ? ((markPx - prevDayPx) / prevDayPx) * 100 : 0;

    markets.push({
      contract: asset.name,
      venue,
      platform: "hyperliquid",
      openInterest: safeParseFloat(ctx.openInterest),
      volume24h: safeParseFloat(ctx.dayNtlVlm),
      markPx,
      oraclePx: safeParseFloat(ctx.oraclePx),
      midPx: safeParseFloat(ctx.midPx),
      prevDayPx,
      priceChange24h,
      fundingRate: safeParseFloat(ctx.funding),
      premium: safeParseFloat(ctx.premium),
      maxLeverage: asset.maxLeverage ?? 0,
      szDecimals: asset.szDecimals ?? 0,
    });
  }

  return markets;
}

export function parseFundingHistory(
  entries: FundingHistoryEntry[],
  venue: string,
  openInterest: number
): Array<{
  timestamp: number;
  contract: string;
  venue: string;
  fundingRate: number;
  premium: number;
  openInterest: number;
  fundingPayment: number;
}> {
  return entries.map((entry) => {
    const fundingRate = safeParseFloat(entry.fundingRate);
    const premium = safeParseFloat(entry.premium);
    // funding payment = fundingRate * openInterest (approximation using current OI)
    const fundingPayment = fundingRate * openInterest;

    return {
      timestamp: Math.floor(entry.time / 1000),
      contract: entry.coin,
      venue,
      fundingRate,
      premium,
      openInterest,
      fundingPayment,
    };
  });
}

// ---------------------------------------------------------------------------
// PlatformAdapter wrapper
// ---------------------------------------------------------------------------

export const hyperliquidAdapter: PlatformAdapter = {
  name: "hyperliquid",
  oiIsNotional: false, // OI is in base-asset units; pipeline multiplies by markPx
  async fetchMarkets(): Promise<ParsedPerpsMarket[]> {
    const venues = await fetchPerpDexs();
    if (venues.length === 0) return [];

    const results = await Promise.all(venues.map((v) => fetchMetaAndAssetCtxs(v.name)));

    const allMarkets: ParsedPerpsMarket[] = [];
    for (let i = 0; i < venues.length; i++) {
      const response = results[i];
      if (!response) continue;
      const markets = parseMetaAndAssetCtxs(response, venues[i].name);
      allMarkets.push(...markets);
    }
    return allMarkets;
  },
  async fetchFundingHistory(market, startTime, endTime): Promise<FundingEntry[]> {
    const entries = await fetchFundingHistory(market.contract, startTime, endTime);
    if (entries.length === 0) return [];
    return parseFundingHistory(entries, market.venue, market.openInterest);
  },
};
