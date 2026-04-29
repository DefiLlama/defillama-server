/**
 * Shared types for RWA perps platform adapters.
 *
 * Each platform adapter implements `PlatformAdapter` and normalizes its
 * API responses into `ParsedPerpsMarket[]`.
 */

export interface ParsedPerpsMarket {
  /** Canonical market ID (e.g., "xyz:TSLA", "ostium:TSLA-USD") */
  contract: string;
  /** Venue or sub-platform name (e.g., "xyz" for Hyperliquid HIP-3, "gtrade" for gTrade) */
  venue: string;
  /** Platform adapter name — used to look up the adapter for funding history, OI normalization, etc. */
  platform: string;
  /** Open interest — base-asset units for Hyperliquid, USD notional for most others (see oiIsNotional) */
  openInterest: number;
  /** 24h trading volume in USD notional */
  volume24h: number;
  /** Mark / last price */
  markPx: number;
  /** Oracle price (0 if unavailable) */
  oraclePx: number;
  /** Mid price (0 if unavailable) */
  midPx: number;
  /** Previous day close price (0 if unavailable) */
  prevDayPx: number;
  /** 24h price change as a percentage (e.g., 2.5 means +2.5%) */
  priceChange24h: number;
  /** Current funding rate (per the platform's native period — 1h or 8h) */
  fundingRate: number;
  /** Premium over index (0 if not applicable) */
  premium: number;
  /** Maximum leverage offered */
  maxLeverage: number;
  /** Size decimals (0 if not applicable) */
  szDecimals: number;
}

export interface FundingEntry {
  timestamp: number;
  contract: string;
  venue: string;
  fundingRate: number;
  premium: number;
  openInterest: number;
  fundingPayment: number;
}

export interface PlatformAdapter {
  /** Unique platform identifier (e.g., "hyperliquid", "gtrade") */
  name: string;
  /**
   * If `true`, `openInterest` in ParsedPerpsMarket is already USD notional.
   * If `false`, the pipeline multiplies OI by markPx to get notional.
   */
  oiIsNotional: boolean;
  /** Fetch all live markets for this platform. */
  fetchMarkets(): Promise<ParsedPerpsMarket[]>;
  /**
   * Fetch funding history entries for a single market.
   * Return an empty array if the platform has no funding history API.
   */
  fetchFundingHistory(
    market: ParsedPerpsMarket,
    startTime: number,
    endTime?: number,
  ): Promise<FundingEntry[]>;
}

export function safeFloat(val: string | number | undefined | null): number {
  if (val === undefined || val === null || val === "") return 0;
  const num = typeof val === "number" ? val : parseFloat(String(val));
  return Number.isFinite(num) ? num : 0;
}

/**
 * Fetch JSON from a URL with standardized error handling.
 * Returns `null` on any failure (network error, non-2xx status).
 */
export async function safeFetch<T>(
  url: string,
  label: string,
  init?: RequestInit,
): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) {
      console.error(`${label} ${res.status}: ${res.statusText}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error(`${label} error:`, e);
    return null;
  }
}

export function pctChange(current: number, previous: number): number {
  if (previous <= 0) return 0;
  return ((current - previous) / previous) * 100;
}
