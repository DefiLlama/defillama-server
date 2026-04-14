import type { PlatformAdapter, FundingEntry, ParsedPerpsMarket } from "./types";
import { safeFloat } from "./types";

// Extended (formerly 10x Exchange) — StarkNet
// Docs: https://docs.extended.exchange
// API: https://api.docs.extended.exchange
// RWA assets: 28+ TradFi markets (equities, commodities, indices, FX)
// Margin: USDC | Oracle: multiple

export const EXTENDED_MAKER_FEE = 0.0002;
export const EXTENDED_TAKER_FEE = 0.0005;

const EXTENDED_API = "https://api.starknet.extended.exchange/api/v1";

// ---------------------------------------------------------------------------
// Raw API types (matches actual Extended /info/markets response)
// ---------------------------------------------------------------------------

interface ExtendedMarketStats {
  dailyVolume: string;
  dailyVolumeBase?: string;
  dailyPriceChange?: string;
  dailyPriceChangePercentage?: string;
  dailyLow?: string;
  dailyHigh?: string;
  lastPrice: string;
  askPrice?: string;
  bidPrice?: string;
  markPrice: string;
  indexPrice: string;
  fundingRate: string;
  nextFundingRate?: number;
  openInterest: string;
  openInterestBase?: string;
}

interface ExtendedTradingConfig {
  maxLeverage: string;
  minOrderSize?: string;
  maxPositionValue?: string;
}

interface ExtendedMarket {
  name: string;          // e.g., "AAPL_24_5-USD", "XAU-USD"
  uiName?: string;
  category: string;      // "Crypto" | "Meme" | "TradFi"
  subCategory?: string;
  assetName: string;     // e.g., "AAPL_24_5", "XAU"
  collateralAssetName: string; // "USD"
  description?: string;
  active: boolean;
  status: string;        // "ACTIVE" | "DISABLED"
  marketStats: ExtendedMarketStats;
  tradingConfig: ExtendedTradingConfig;
}

interface ExtendedMarketsResponse {
  status: string;
  data: ExtendedMarket[];
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
    const data: ExtendedMarketsResponse = await res.json();
    return data?.data ?? null;
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
    // Only TradFi category = RWA
    if (mkt.category !== "TradFi") continue;
    if (mkt.status !== "ACTIVE" || !mkt.active) continue;

    const stats = mkt.marketStats;
    const config = mkt.tradingConfig;

    // Contract ID: use the market name as-is (e.g., "extended:AAPL_24_5-USD")
    const contract = `extended:${mkt.name}`;

    const markPx = safeFloat(stats.markPrice);
    const indexPx = safeFloat(stats.indexPrice);
    const lastPx = safeFloat(stats.lastPrice);
    const price = markPx || lastPx;

    markets.push({
      contract,
      venue: "extended",
      platform: "extended",
      openInterest: safeFloat(stats.openInterest),
      volume24h: safeFloat(stats.dailyVolume),
      markPx: price,
      oraclePx: indexPx || price,
      midPx: price,
      prevDayPx: 0,
      priceChange24h: safeFloat(stats.dailyPriceChangePercentage) * 100, // API returns decimal (0.0357 = 3.57%)
      fundingRate: safeFloat(stats.fundingRate),
      premium: 0,
      maxLeverage: safeFloat(config.maxLeverage),
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
  oiIsNotional: true, // Extended OI is USD notional
  async fetchMarkets(): Promise<ParsedPerpsMarket[]> {
    const raw = await fetchExtendedMarkets();
    if (!raw || raw.length === 0) return [];
    return parseExtendedMarkets(raw);
  },
  async fetchFundingHistory(): Promise<FundingEntry[]> {
    // Extended funding history requires authenticated API access.
    return [];
  },
};
