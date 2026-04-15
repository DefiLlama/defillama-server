import type { PlatformAdapter, FundingEntry, ParsedPerpsMarket } from "./types";
import { safeFloat, safeFetch } from "./types";

// Helix — Injective chain
// LCD: https://sentry.lcd.injective.network
// Exchange indexer: https://sentry.exchange.grpc-web.injective.network
// RWA assets: 17+ (equities, precious metals, oil, private valuations, forex)
// Margin: USDT | Oracle: Pyth

export const HELIX_MAKER_FEE = 0; // maker rebate on some tiers
export const HELIX_TAKER_FEE = 0.0005;

const INJECTIVE_LCD = "https://sentry.lcd.injective.network";
const INJECTIVE_INDEXER = "https://sentry.exchange.grpc-web.injective.network";

// ---------------------------------------------------------------------------
// Raw API types
// ---------------------------------------------------------------------------

// LCD /injective/exchange/v2/derivative/markets response
interface InjectiveMarketWrapper {
  market: {
    market_id: string;
    ticker: string;
    oracle_base: string;
    oracle_type: string;
    initial_margin_ratio: string;
    maker_fee_rate: string;
    taker_fee_rate: string;
    isPerpetual: boolean;
    status: string;
    quote_decimals?: number;
  };
  perpetual_info?: {
    market_info: {
      hourly_funding_rate_cap: string;
      hourly_interest_rate: string;
    };
    funding_info: {
      cumulative_funding: string;
    };
  };
  mark_price: string;
  mid_price_and_tob?: {
    mid_price: string;
  };
}

// Chronos /api/chronos/v1/derivative/market_summary_all response
interface ChronosSummary {
  marketId: string;
  open: number;
  high: number;
  low: number;
  volume: number;  // USD notional
  price: number;
  change: number;  // percentage
}

// Exchange indexer /api/exchange/derivative/v1/openInterest response
interface OIResponse {
  openInterests: Array<{ marketId: string; openInterest: string }>;
}

// Known RWA tickers on Helix
const HELIX_RWA_BASES = new Set([
  "AAPL", "AMZN", "ANTHROPIC", "COIN", "CRCL", "EUR", "GBP", "GOOGL",
  "HOOD", "META", "MSFT", "MSTR", "NVDA", "PLTR", "SPACEX", "TSLA",
  "USOIL", "XAG", "XAU",
]);

function isRwaTicker(ticker: string): boolean {
  const base = ticker.split("/")[0]?.trim();
  return HELIX_RWA_BASES.has(base);
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

async function fetchLcdMarkets(): Promise<InjectiveMarketWrapper[]> {
  const data = await safeFetch<{ markets?: InjectiveMarketWrapper[] }>(
    `${INJECTIVE_LCD}/injective/exchange/v2/derivative/markets?status=Active`, "Helix fetchLcdMarkets",
  );
  return data?.markets ?? [];
}

async function fetchChronosSummaries(): Promise<Map<string, ChronosSummary>> {
  const data = await safeFetch<ChronosSummary[]>(
    `${INJECTIVE_INDEXER}/api/chronos/v1/derivative/market_summary_all`, "Helix fetchChronosSummaries",
  );
  if (!data) return new Map();
  const map = new Map<string, ChronosSummary>();
  for (const s of data) {
    if (s.marketId) map.set(s.marketId, s);
  }
  return map;
}

async function fetchOpenInterest(marketIds: string[]): Promise<Map<string, number>> {
  if (marketIds.length === 0) return new Map();
  const params = marketIds.map((id) => `marketIDs=${id}`).join("&");
  const data = await safeFetch<OIResponse>(
    `${INJECTIVE_INDEXER}/api/exchange/derivative/v1/openInterest?${params}`, "Helix fetchOpenInterest",
  );
  if (!data) return new Map();
  const map = new Map<string, number>();
  for (const entry of data.openInterests ?? []) {
    map.set(entry.marketId, safeFloat(entry.openInterest));
  }
  return map;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function parseHelixMarkets(
  wrappers: InjectiveMarketWrapper[],
  summaries: Map<string, ChronosSummary>,
  oiMap: Map<string, number>,
): ParsedPerpsMarket[] {
  const result: ParsedPerpsMarket[] = [];

  for (const w of wrappers) {
    const mkt = w.market;
    if (!mkt.isPerpetual) continue;
    if (!isRwaTicker(mkt.ticker)) continue;

    const base = mkt.ticker.split("/")[0]?.trim() ?? "";
    const quote = mkt.ticker.split("/")[1]?.split(" ")[0]?.trim() ?? "USDT";
    const contract = `helix:${base}-${quote}`;
    const marketId = mkt.market_id;

    // Price: prefer Chronos summary, fall back to LCD mark_price
    const summary = summaries.get(marketId);
    const markPx = summary?.price ?? safeFloat(w.mark_price);
    const midPx = safeFloat(w.mid_price_and_tob?.mid_price) || markPx;

    // Volume from Chronos (already USD notional)
    const volume24h = summary?.volume ?? 0;

    // OI from exchange indexer (base units) × price → USD notional
    const oiBase = oiMap.get(marketId) ?? 0;
    const openInterest = oiBase * markPx;

    // Price change from Chronos
    const priceChange24h = summary?.change ?? 0;

    // Funding rate
    const fundingRate = w.perpetual_info
      ? safeFloat(w.perpetual_info.market_info.hourly_interest_rate)
      : 0;

    // Max leverage = 1 / initial_margin_ratio
    const imr = safeFloat(mkt.initial_margin_ratio);
    const maxLeverage = imr > 0 ? Math.floor(1 / imr) : 0;

    result.push({
      contract,
      venue: "helix",
      platform: "helix",
      openInterest,
      volume24h,
      markPx,
      oraclePx: markPx,
      midPx,
      prevDayPx: summary?.open ?? 0,
      priceChange24h,
      fundingRate,
      premium: 0,
      maxLeverage,
      szDecimals: 0,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export const helixAdapter: PlatformAdapter = {
  name: "helix",
  oiIsNotional: true, // We convert OI to USD in the parser
  async fetchMarkets(): Promise<ParsedPerpsMarket[]> {
    // 1. Fetch LCD markets for metadata (tickers, funding, leverage)
    const lcdMarkets = await fetchLcdMarkets();
    if (lcdMarkets.length === 0) return [];

    // 2. Collect RWA market IDs for OI fetch
    const rwaMarketIds = lcdMarkets
      .filter((w) => w.market.isPerpetual && isRwaTicker(w.market.ticker))
      .map((w) => w.market.market_id);

    // 3. Fetch OI + volume/price in parallel
    const [summaries, oiMap] = await Promise.all([
      fetchChronosSummaries(),
      fetchOpenInterest(rwaMarketIds),
    ]);

    return parseHelixMarkets(lcdMarkets, summaries, oiMap);
  },
  async fetchFundingHistory(): Promise<FundingEntry[]> {
    return [];
  },
};
