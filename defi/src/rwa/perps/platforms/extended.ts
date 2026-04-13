import type { PlatformAdapter, FundingEntry, ParsedPerpsMarket } from "./types";
import { safeFloat } from "./types";

// Extended (formerly 10x Exchange) — StarkNet
// Docs: https://docs.extended.exchange
// API: https://api.docs.extended.exchange
// RWA assets: 16 (6 equities, 1 ETF, 2 indices, 3 precious metals, 2 oil, 1 nat gas, 1 industrial metals)
// Margin: USDC | Oracle: multiple

export const EXTENDED_MAKER_FEE = 0.0002;
export const EXTENDED_TAKER_FEE = 0.0005;

const EXTENDED_API = "https://api.starknet.extended.exchange/api/v1";

// ---------------------------------------------------------------------------
// Raw API types
// ---------------------------------------------------------------------------

interface ExtendedMarket {
  id?: string;
  symbol?: string;
  name?: string;
  baseAsset?: string;
  quoteAsset?: string;
  status?: string;
  type?: string;
  markPrice?: string | number;
  indexPrice?: string | number;
  lastPrice?: string | number;
  volume24h?: string | number;
  quoteVolume24h?: string | number;
  openInterest?: string | number;
  fundingRate?: string | number;
  nextFundingTime?: number;
  priceChange24h?: string | number;
  priceChangePercent24h?: string | number;
  highPrice24h?: string | number;
  lowPrice24h?: string | number;
  maxLeverage?: number;
  makerFee?: string | number;
  takerFee?: string | number;
}

// RWA-relevant symbols on Extended (partial — Airtable metadata gate handles filtering)
const EXTENDED_RWA_BASES = new Set([
  "AAPL", "TSLA", "NVDA", "GOOG", "MSFT", "META",
  "SPY",
  "SPX", "NDX",
  "XAU", "XAG", "XPT",
  "WTI", "BRENT",
  "NG",
  "XCU",
]);

function isLikelyRwa(symbol: string, baseAsset?: string): boolean {
  const base = baseAsset?.toUpperCase() ?? symbol?.split("-")[0]?.split("/")[0]?.toUpperCase();
  return !!base && EXTENDED_RWA_BASES.has(base);
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

async function fetchExtendedMarkets(): Promise<ExtendedMarket[] | null> {
  try {
    const res = await fetch(`${EXTENDED_API}/info/markets`);
    if (!res.ok) {
      console.error(`Extended API ${res.status}: ${res.statusText}`);
      return null;
    }
    const data = await res.json();
    // Response may be { data: [...] } or [...] depending on version
    const markets = data?.data ?? data?.markets ?? data;
    return Array.isArray(markets) ? markets : null;
  } catch (e) {
    console.error("Extended fetchMarkets error:", e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function parseExtendedMarkets(raw: ExtendedMarket[]): ParsedPerpsMarket[] {
  const markets: ParsedPerpsMarket[] = [];

  for (const mkt of raw) {
    if (mkt.status && mkt.status !== "active" && mkt.status !== "Active") continue;

    const base = mkt.baseAsset ?? mkt.symbol?.split("-")[0]?.split("/")[0] ?? "";
    const quote = mkt.quoteAsset ?? mkt.symbol?.split("-")[1]?.split("/")[1] ?? "USDC";
    if (!isLikelyRwa(mkt.symbol ?? "", base)) continue;

    const contract = `extended:${base.toUpperCase()}-${quote.toUpperCase()}`;

    const markPx = safeFloat(mkt.markPrice ?? mkt.lastPrice);
    const indexPx = safeFloat(mkt.indexPrice);
    const openInterest = safeFloat(mkt.openInterest);
    const volume24h = safeFloat(mkt.quoteVolume24h ?? mkt.volume24h);

    const pxChangePct = mkt.priceChangePercent24h != null
      ? safeFloat(mkt.priceChangePercent24h)
      : safeFloat(mkt.priceChange24h);

    markets.push({
      contract,
      venue: "extended",
      platform: "extended",
      openInterest,
      volume24h,
      markPx,
      oraclePx: indexPx || markPx,
      midPx: markPx,
      prevDayPx: 0,
      priceChange24h: pxChangePct,
      fundingRate: safeFloat(mkt.fundingRate),
      premium: 0,
      maxLeverage: mkt.maxLeverage ?? 0,
      szDecimals: 0,
    });
  }

  return markets;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export const extendedAdapter: PlatformAdapter = {
  name: "extended",
  oiIsNotional: true,
  async fetchMarkets(): Promise<ParsedPerpsMarket[]> {
    const raw = await fetchExtendedMarkets();
    if (!raw || raw.length === 0) return [];
    return parseExtendedMarkets(raw);
  },
  async fetchFundingHistory(): Promise<FundingEntry[]> {
    // Extended funding history requires authenticated API access.
    // Not implemented in initial version.
    return [];
  },
};
