import type { PlatformAdapter, FundingEntry, ParsedPerpsMarket } from "./types";
import { safeFloat } from "./types";

// gTrade (Gains Network) — Arbitrum, Base, Polygon
// Docs: https://docs.gains.trade/developer/integrators/backend
// RWA assets: 15 (10 equities, 2 indices, 2 precious metals, 1 oil)
// Margin: USDC | Oracle: Chainlink DON

export const GTRADE_MAKER_FEE = 0.0008;
export const GTRADE_TAKER_FEE = 0.0008;

const GTRADE_BACKEND = "https://backend-api.gains.trade/api";

// ---------------------------------------------------------------------------
// Raw API types
// ---------------------------------------------------------------------------

interface GtradePairData {
  from: string;
  to: string;
  groupIndex: number;
  pairIndex: number;
  spreadP: string;
  feeIndex: number;
  maxLeverage?: number;
}

interface GtradeOpenInterest {
  long: string;
  short: string;
  max: string;
}

interface GtradeMarketResponse {
  pairs: GtradePairData[];
  openInterests?: GtradeOpenInterest[];
  currentPrices?: Record<string, string>;
  groups?: Array<{ name: string; minLeverage: number; maxLeverage: number }>;
}

// RWA-relevant group indices in gTrade: 2 = stocks, 3 = indices, 4 = commodities
const RWA_GROUP_INDICES = new Set([2, 3, 4]);

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

async function fetchGtradeMarkets(): Promise<GtradeMarketResponse | null> {
  try {
    const res = await fetch(`${GTRADE_BACKEND}/trading-variables`);
    if (!res.ok) {
      console.error(`gTrade API ${res.status}: ${res.statusText}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error("gTrade fetchMarkets error:", e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function parseGtradeMarkets(data: GtradeMarketResponse): ParsedPerpsMarket[] {
  const markets: ParsedPerpsMarket[] = [];
  const { pairs, openInterests, currentPrices, groups } = data;

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    if (!RWA_GROUP_INDICES.has(pair.groupIndex)) continue;

    const ticker = `${pair.from}/${pair.to}`;
    const contract = `gtrade:${pair.from}-${pair.to}`;

    const oiData = openInterests?.[i];
    const oiLong = safeFloat(oiData?.long);
    const oiShort = safeFloat(oiData?.short);
    const openInterest = oiLong + oiShort; // already USD notional in gTrade

    const price = safeFloat(currentPrices?.[String(i)] ?? currentPrices?.[ticker]);

    const group = groups?.[pair.groupIndex];
    const maxLeverage = pair.maxLeverage ?? group?.maxLeverage ?? 0;

    markets.push({
      contract,
      venue: "gtrade",
      platform: "gtrade",
      openInterest,
      volume24h: 0, // gTrade REST API doesn't expose 24h volume; populated from subgraph/Dune
      markPx: price,
      oraclePx: price,
      midPx: price,
      prevDayPx: 0,
      priceChange24h: 0,
      fundingRate: 0, // gTrade uses borrowing fees, not traditional funding
      premium: 0,
      maxLeverage,
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
  oiIsNotional: true,
  async fetchMarkets(): Promise<ParsedPerpsMarket[]> {
    const data = await fetchGtradeMarkets();
    if (!data?.pairs) return [];
    return parseGtradeMarkets(data);
  },
  async fetchFundingHistory(): Promise<FundingEntry[]> {
    // gTrade uses a borrowing-fee model, not traditional periodic funding.
    return [];
  },
};
