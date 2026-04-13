import type { PlatformAdapter, FundingEntry, ParsedPerpsMarket } from "./types";
import { safeFloat } from "./types";

// Helix — Injective chain
// Docs: https://docs.trading.injective.network/helix/api
// RWA assets: 16 (10 equities, 2 precious metals, 1 oil, 3 private valuations)
// Margin: USDT | Oracle: Injective native

export const HELIX_MAKER_FEE = -0.0001; // maker rebate
export const HELIX_TAKER_FEE = 0.001;

const INJECTIVE_LCD = "https://sentry.lcd.injective.network";

// ---------------------------------------------------------------------------
// Raw API types
// ---------------------------------------------------------------------------

interface InjectiveDerivativeMarket {
  marketId: string;
  marketStatus: string;
  ticker: string;
  oracleBase: string;
  oracleQuote: string;
  oracleType: string;
  makerFeeRate: string;
  takerFeeRate: string;
  initialMarginRatio: string;
  maintenanceMarginRatio: string;
  isPerpetual: boolean;
  minPriceTickSize: string;
  minQuantityTickSize: string;
  perpetualMarketInfo?: {
    hourlyFundingRateCap: string;
    hourlyInterestRate: string;
    nextFundingTimestamp: string;
    fundingInterval: string;
  };
  perpetualMarketFunding?: {
    cumulativeFunding: string;
    cumulativePrice: string;
    lastTimestamp: string;
  };
  markPrice?: string;
  midPrice?: string;
}

interface InjectiveMarketsResponse {
  markets: InjectiveDerivativeMarket[];
}

// Known RWA tickers on Helix (partial list — the Airtable metadata gate handles filtering)
const HELIX_RWA_ORACLES = new Set([
  "AAPL", "TSLA", "NVDA", "AMZN", "GOOG", "MSFT", "META", "NFLX", "SPY", "QQQ",
  "XAU", "XAG", "WTI", "BRENT",
  "SPACEX", "OPENAI", "ANTHROPIC",
]);

function isLikelyRwa(ticker: string, oracleBase: string): boolean {
  // Tickers look like "TSLA/USDT PERP" or "XAU/USDT PERP"
  const base = ticker.split("/")[0]?.trim();
  return HELIX_RWA_ORACLES.has(base) || HELIX_RWA_ORACLES.has(oracleBase);
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

async function fetchInjectiveDerivativeMarkets(): Promise<InjectiveDerivativeMarket[] | null> {
  try {
    const res = await fetch(`${INJECTIVE_LCD}/injective/exchange/v2/derivative/markets?status=Active`);
    if (!res.ok) {
      console.error(`Injective LCD ${res.status}: ${res.statusText}`);
      return null;
    }
    const data: InjectiveMarketsResponse = await res.json();
    return data?.markets ?? null;
  } catch (e) {
    console.error("Helix fetchMarkets error:", e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function parseInjectiveMarkets(markets: InjectiveDerivativeMarket[]): ParsedPerpsMarket[] {
  const result: ParsedPerpsMarket[] = [];

  for (const mkt of markets) {
    if (!mkt.isPerpetual) continue;
    if (!isLikelyRwa(mkt.ticker, mkt.oracleBase)) continue;

    // Ticker format: "TSLA/USDT PERP" → base = "TSLA"
    const base = mkt.ticker.split("/")[0]?.trim() ?? mkt.oracleBase;
    const quote = mkt.ticker.split("/")[1]?.split(" ")[0]?.trim() ?? "USDT";
    const contract = `helix:${base}-${quote}`;

    const markPx = safeFloat(mkt.markPrice);
    const midPx = safeFloat(mkt.midPrice);
    const price = markPx || midPx;

    // Funding rate from perpetualMarketFunding
    const fundingRate = mkt.perpetualMarketInfo
      ? safeFloat(mkt.perpetualMarketInfo.hourlyInterestRate)
      : 0;

    // Max leverage from initial margin ratio: leverage = 1 / initialMarginRatio
    const imr = safeFloat(mkt.initialMarginRatio);
    const maxLeverage = imr > 0 ? Math.floor(1 / imr) : 0;

    result.push({
      contract,
      venue: "helix",
      platform: "helix",
      openInterest: 0, // OI not directly in LCD markets response; populated via exchange queries
      volume24h: 0,     // Volume needs exchange indexer; populated via ticker API
      markPx: price,
      oraclePx: price,
      midPx: midPx || price,
      prevDayPx: 0,
      priceChange24h: 0,
      fundingRate,
      premium: 0,
      maxLeverage,
      szDecimals: 0,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Supplement: Helix Gateway ticker data (OI + volume)
// ---------------------------------------------------------------------------

interface HelixTicker {
  symbol?: string;
  baseAsset?: string;
  quoteAsset?: string;
  lastPrice?: string;
  priceChange24h?: string;
  priceChangePercent24h?: string;
  quoteVolume?: string;
  volume?: string;
  openInterest?: string;
  fundingRate?: string;
}

const HELIX_GATEWAY = "https://dgw.helixic.io/api/v1";

async function fetchHelixTickers(): Promise<HelixTicker[] | null> {
  try {
    const res = await fetch(`${HELIX_GATEWAY}/ticker`);
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : data?.tickers ?? null;
  } catch (e) {
    console.error("Helix Gateway ticker error:", e);
    return null;
  }
}

function enrichWithTickerData(markets: ParsedPerpsMarket[], tickers: HelixTicker[]): void {
  // Build a lookup by base symbol
  const tickerByBase = new Map<string, HelixTicker>();
  for (const t of tickers) {
    const base = t.baseAsset ?? t.symbol?.split("/")[0]?.split("-")[0]?.trim();
    if (base) tickerByBase.set(base.toUpperCase(), t);
  }

  for (const market of markets) {
    // Extract base from contract: "helix:TSLA-USDT" → "TSLA"
    const base = market.contract.split(":")[1]?.split("-")[0]?.toUpperCase();
    if (!base) continue;

    const ticker = tickerByBase.get(base);
    if (!ticker) continue;

    const volume = safeFloat(ticker.quoteVolume ?? ticker.volume);
    if (volume > 0) market.volume24h = volume;

    const oi = safeFloat(ticker.openInterest);
    if (oi > 0) market.openInterest = oi;

    const price = safeFloat(ticker.lastPrice);
    if (price > 0 && market.markPx === 0) market.markPx = price;

    const pxChange = safeFloat(ticker.priceChangePercent24h ?? ticker.priceChange24h);
    if (pxChange !== 0) market.priceChange24h = pxChange;

    const fr = safeFloat(ticker.fundingRate);
    if (fr !== 0) market.fundingRate = fr;
  }
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export const helixAdapter: PlatformAdapter = {
  name: "helix",
  oiIsNotional: true, // Helix OI from ticker is USD notional
  async fetchMarkets(): Promise<ParsedPerpsMarket[]> {
    const [rawMarkets, tickers] = await Promise.all([
      fetchInjectiveDerivativeMarkets(),
      fetchHelixTickers(),
    ]);

    if (!rawMarkets || rawMarkets.length === 0) return [];
    const markets = parseInjectiveMarkets(rawMarkets);

    if (tickers && tickers.length > 0) {
      enrichWithTickerData(markets, tickers);
    }

    return markets;
  },
  async fetchFundingHistory(): Promise<FundingEntry[]> {
    // Injective funding history requires exchange indexer gRPC queries.
    // Not implemented in initial version.
    return [];
  },
};
