import type { PlatformAdapter, FundingEntry, ParsedPerpsMarket } from "./types";
import { safeFloat } from "./types";
import { fetchPythPricesBySymbol, fetchOstiumFallbackPrices } from "./pyth";

// gTrade (Gains Network) — Arbitrum (primary), Base, Polygon
// Docs: https://docs.gains.trade/developer/integrators/backend
// RWA assets: 15+ (equities, indices, commodities)
// Margin: USDC (primary), DAI, WETH, GNS | Oracle: Chainlink DON

export const GTRADE_MAKER_FEE = 0.0008;
export const GTRADE_TAKER_FEE = 0.0008;

// Per-chain backend APIs (old unified backend-api.gains.trade is dead)
const GTRADE_ARBITRUM_API = "https://backend-arbitrum.gains.trade";

// ---------------------------------------------------------------------------
// Raw API types
// ---------------------------------------------------------------------------

interface GtradePair {
  from: string;
  to: string;
  groupIndex: string;
  feeIndex: string;
  spreadP: string;
}

interface GtradeGroup {
  name: string;
  minLeverage: number;
  maxLeverage: number;
}

interface GtradePairOi {
  collateral: { oiLongCollateral: string; oiShortCollateral: string };
  token: { oiLongToken: string; oiShortToken: string };
}

interface GtradeCollateral {
  collateralIndex: number;
  symbol: string;
  isActive: boolean;
  prices: { collateralPriceUsd: number };
  collateralConfig: { precision: number; decimals: number };
  pairOis: GtradePairOi[];
}

interface GtradeTradingVars {
  pairs: GtradePair[];
  groups: GtradeGroup[];
  collaterals: GtradeCollateral[];
}

// RWA group names on gTrade
const RWA_GROUP_NAMES = /stock|indic|commod/i;

// gTrade symbol → Pyth symbol aliases for known mismatches
const PYTH_SYMBOL_ALIASES: Record<string, string> = {
  FB: "META",       // Facebook rebranded to Meta
  WTI: "XTI",       // WTI crude oil → Pyth uses XTI (Metal.XTI/USD)
  HG: "XCU",        // Copper (COMEX symbol HG) → Pyth uses XCU (Metal.XCU/USD)
};

/**
 * Normalize a gTrade symbol for Pyth lookup:
 * 1. Strip `_N` numeric suffixes (e.g., GOOGL_1 → GOOGL, TSLA_1 → TSLA)
 * 2. Apply known aliases (e.g., FB → META, WTI → XTI)
 */
function toPythSymbol(gtradeSymbol: string): string {
  const stripped = gtradeSymbol.replace(/_\d+$/, "");
  return PYTH_SYMBOL_ALIASES[stripped] ?? stripped;
}

// gTrade symbol → Ostium symbol aliases for fallback pricing
// Used when Pyth has no price (off-hours, inactive feeds, missing symbols)
const OSTIUM_SYMBOL_ALIASES: Record<string, string> = {
  WTI: "CLUSD",       // CL is Ostium's crude oil symbol
  HG: "HGUSD",        // Ostium uses HG for copper too
  SPX500: "SPXUSD",   // Ostium index symbol
  NAS100: "NDXUSD",   // Ostium index symbol
  USA30: "DJIUSD",    // Ostium index symbol
  BRENT: "BRENTUSD",  // Ostium commodity symbol
};

/**
 * Look up a gTrade symbol in the Ostium price map.
 * Tries the direct symbol+USD first, then known aliases.
 */
function getOstiumPrice(gtradeSymbol: string, ostiumPrices: Map<string, number>): number {
  const stripped = gtradeSymbol.replace(/_\d+$/, "");
  // Try known alias first
  const aliasKey = OSTIUM_SYMBOL_ALIASES[stripped];
  if (aliasKey) {
    const price = ostiumPrices.get(aliasKey);
    if (price) return price;
  }
  // Try direct: SYMBOL + USD
  return ostiumPrices.get(`${stripped}USD`) ?? 0;
}

// ---------------------------------------------------------------------------
// Volume — stats.gains.trade exposes per-pair 24h volume as JSON
// ---------------------------------------------------------------------------

const GTRADE_STATS_URL = "https://stats.gains.trade/volume";

interface GtradeVolumeResponse {
  totalVolume: number;
  volumeBreakdown: Record<string, number>; // "SPY/USD" → 46991.61
  lastRefreshed: string;
}

/**
 * Fetch per-pair 24h volume from the gTrade stats API.
 * Returns a Map: "FROM/TO" (e.g., "SPY/USD") → volume in USD.
 */
async function fetchGtradeVolumes(): Promise<Map<string, number>> {
  try {
    const res = await fetch(GTRADE_STATS_URL, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      console.error(`gTrade stats ${res.status}: ${res.statusText}`);
      return new Map();
    }
    const data: GtradeVolumeResponse = await res.json();
    const map = new Map<string, number>();
    for (const [pair, vol] of Object.entries(data.volumeBreakdown ?? {})) {
      if (vol > 0) map.set(pair, vol);
    }
    return map;
  } catch (e) {
    console.error("gTrade fetchVolumes error:", e);
    return new Map();
  }
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

async function fetchGtradeTradingVars(): Promise<GtradeTradingVars | null> {
  try {
    const res = await fetch(`${GTRADE_ARBITRUM_API}/trading-variables`);
    if (!res.ok) {
      console.error(`gTrade API ${res.status}: ${res.statusText}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error("gTrade fetchTradingVars error:", e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function parseGtradeMarkets(data: GtradeTradingVars): ParsedPerpsMarket[] {
  const { pairs, groups, collaterals } = data;
  const markets: ParsedPerpsMarket[] = [];

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    const groupIdx = parseInt(pair.groupIndex, 10);
    const group = groups[groupIdx];
    if (!group || !RWA_GROUP_NAMES.test(group.name)) continue;

    const contract = `gtrade:${pair.from}-${pair.to}`;

    // Sum OI across all collaterals: collateral amount / precision * priceUsd
    let oiUsd = 0;
    for (const coll of collaterals) {
      const pairOi = coll.pairOis?.[i];
      if (!pairOi) continue;
      const precision = coll.collateralConfig?.precision || 1;
      const priceUsd = coll.prices?.collateralPriceUsd || 0;
      const longC = safeFloat(pairOi.collateral?.oiLongCollateral);
      const shortC = safeFloat(pairOi.collateral?.oiShortCollateral);
      oiUsd += ((longC + shortC) / precision) * priceUsd;
    }

    // gTrade maxLeverage is stored × 1000 (e.g., 50000 = 50x)
    const maxLev = (group.maxLeverage ?? 0) / 1000;

    markets.push({
      contract,
      venue: "gtrade",
      platform: "gtrade",
      openInterest: oiUsd,
      volume24h: 0, // filled below from stats.gains.trade
      markPx: 0,    // Prices come from Chainlink DON, not in trading-variables
      oraclePx: 0,
      midPx: 0,
      prevDayPx: 0,
      priceChange24h: 0,
      fundingRate: 0, // gTrade uses borrowing fees, not traditional funding
      premium: 0,
      maxLeverage: maxLev,
      szDecimals: 0,
    });
  }

  return markets;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export const gtradeAdapter: PlatformAdapter = {
  name: "gtrade",
  oiIsNotional: true, // OI is collateral (margin) in USD — already converted
  async fetchMarkets(): Promise<ParsedPerpsMarket[]> {
    const data = await fetchGtradeTradingVars();
    if (!data?.pairs) return [];
    const markets = parseGtradeMarkets(data);
    if (markets.length === 0) return markets;

    // Fetch prices and volumes in parallel
    const rawSymbols = markets.map((m) => m.contract.split(":")[1]?.split("-")[0]).filter(Boolean);
    const pythSymbols = [...new Set(rawSymbols.map(toPythSymbol))];
    const [pythPrices, volumes] = await Promise.all([
      fetchPythPricesBySymbol(pythSymbols),
      fetchGtradeVolumes(),
    ]);

    for (const m of markets) {
      const rawSym = m.contract.split(":")[1]?.split("-")[0] ?? "";
      const pythSym = toPythSymbol(rawSym).toUpperCase();
      const price = pythPrices.get(pythSym) ?? 0;
      m.markPx = price;
      m.oraclePx = price;
      m.midPx = price;

      // Volume: stats API uses "FROM/TO" format (e.g., "SPY/USD")
      const pair = m.contract.split(":")[1]?.replace("-", "/") ?? "";
      m.volume24h = volumes.get(pair) ?? 0;
    }

    // Fallback: for markets still missing prices, try Ostium's live price feed
    const missingPrices = markets.filter((m) => m.markPx === 0);
    if (missingPrices.length > 0) {
      const ostiumPrices = await fetchOstiumFallbackPrices();
      for (const m of missingPrices) {
        const rawSym = m.contract.split(":")[1]?.split("-")[0] ?? "";
        const price = getOstiumPrice(rawSym, ostiumPrices);
        if (price > 0) {
          m.markPx = price;
          m.oraclePx = price;
          m.midPx = price;
        }
      }
    }

    return markets;
  },
  async fetchFundingHistory(): Promise<FundingEntry[]> {
    // gTrade uses a borrowing-fee model, not traditional periodic funding.
    return [];
  },
};
