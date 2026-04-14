import type { PlatformAdapter, FundingEntry, ParsedPerpsMarket } from "./types";
import { safeFloat } from "./types";
import { fetchPythPricesBySymbol } from "./pyth";

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
      volume24h: 0, // gTrade doesn't expose 24h volume via REST
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

    // Fetch prices from Pyth Hermes for all RWA base symbols
    const symbols = [...new Set(markets.map((m) => m.contract.split(":")[1]?.split("-")[0]).filter(Boolean))];
    const pythPrices = await fetchPythPricesBySymbol(symbols);

    for (const m of markets) {
      const sym = m.contract.split(":")[1]?.split("-")[0]?.toUpperCase();
      const price = pythPrices.get(sym ?? "") ?? 0;
      m.markPx = price;
      m.oraclePx = price;
      m.midPx = price;
    }

    return markets;
  },
  async fetchFundingHistory(): Promise<FundingEntry[]> {
    // gTrade uses a borrowing-fee model, not traditional periodic funding.
    return [];
  },
};
