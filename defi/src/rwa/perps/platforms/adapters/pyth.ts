/**
 * Shared price fetchers for RWA perps adapters.
 *
 * Primary: Pyth Hermes
 *   fetchPythPricesByFeedId(ids)   — when the caller already has Pyth feed IDs (Avantis)
 *   fetchPythPricesBySymbol(syms)  — maps base symbols ("AAPL") → feed IDs via benchmarks API (gTrade)
 *
 * Fallback: Ostium live price feed
 *   fetchOstiumFallbackPrices()    — fetches all available prices from Ostium
 */

const PYTH_HERMES = "https://hermes.pyth.network/v2/updates/price/latest";
const PYTH_BENCHMARKS = "https://benchmarks.pyth.network/v1/price_feeds/";

// ---------------------------------------------------------------------------
// Feed resolution (symbol → feed ID)
// ---------------------------------------------------------------------------

interface PythBenchmarkFeed {
  id: string;
  attributes: {
    symbol: string;
    base: string;
    quote_currency: string;
    asset_type: string;
  };
}

let feedMapCache: Map<string, string[]> | null = null;

/**
 * Build a lowercase base symbol → feed ID mapping from the Pyth benchmarks API.
 * Stores multiple feed IDs per symbol: regular-hours first, then .ON (overnight) as fallback.
 * This ensures equity symbols return prices even when US markets are closed.
 */
async function getFeedMap(): Promise<Map<string, string[]>> {
  if (feedMapCache) return feedMapCache;

  try {
    const res = await fetch(PYTH_BENCHMARKS);
    if (!res.ok) throw new Error(`Pyth benchmarks ${res.status}`);
    const feeds: PythBenchmarkFeed[] = await res.json();

    // Collect feeds by session type: regular, overnight (.ON), pre-market (.PRE), post-market (.POST)
    // Priority: regular > ON > PRE > POST (try each in order until a non-zero price is found)
    const buckets: Record<string, Map<string, string>> = {
      regular: new Map(),
      on: new Map(),
      pre: new Map(),
      post: new Map(),
    };

    for (const f of feeds) {
      const { base, quote_currency, symbol } = f.attributes;
      if (quote_currency !== "USD") continue;
      const key = base?.toLowerCase();
      if (!key) continue;
      const feedId = "0x" + f.id;

      let bucket: string;
      if (/\.ON$/.test(symbol)) bucket = "on";
      else if (/\.PRE$/.test(symbol)) bucket = "pre";
      else if (/\.POST$/.test(symbol)) bucket = "post";
      else bucket = "regular";

      const bmap = buckets[bucket];
      if (!bmap.has(key)) bmap.set(key, feedId);
    }

    // Build combined map: regular first, then fallbacks in priority order
    const map = new Map<string, string[]>();
    const allKeys = new Set([
      ...buckets.regular.keys(), ...buckets.on.keys(),
      ...buckets.pre.keys(), ...buckets.post.keys(),
    ]);
    for (const key of allKeys) {
      const ids: string[] = [];
      for (const b of ["regular", "on", "pre", "post"]) {
        const feedId = buckets[b].get(key);
        if (feedId) ids.push(feedId);
      }
      map.set(key, ids);
    }

    feedMapCache = map;
    return map;
  } catch (e) {
    console.error("Pyth getFeedMap error:", e);
    return new Map();
  }
}

// ---------------------------------------------------------------------------
// Price fetching
// ---------------------------------------------------------------------------

/**
 * Fetch latest prices from Pyth Hermes for a list of feed IDs.
 * Returns a Map: feed ID → USD price.
 */
export async function fetchPythPricesByFeedId(
  feedIds: string[],
): Promise<Map<string, number>> {
  const ids = feedIds.filter(Boolean);
  if (ids.length === 0) return new Map();

  try {
    const params = ids.map((id) => `ids[]=${id}`).join("&");
    const res = await fetch(`${PYTH_HERMES}?${params}`);
    if (!res.ok) throw new Error(`Pyth Hermes ${res.status}`);
    const data = await res.json();

    const prices = new Map<string, number>();
    for (const entry of data?.parsed ?? []) {
      const { price, expo } = entry.price;
      const usd = Number(price) * 10 ** Number(expo);
      if (Number.isFinite(usd) && usd > 0) {
        prices.set("0x" + entry.id, usd);
      }
    }
    return prices;
  } catch (e) {
    console.error("Pyth fetchPricesByFeedId error:", e);
    return new Map();
  }
}

/**
 * Fetch latest prices for a list of base symbols (e.g., "AAPL", "XAU", "TSLA").
 * Resolves symbols → Pyth feed IDs via the benchmarks API, then fetches from Hermes.
 * For equity symbols, falls back to overnight feed if regular-hours feed returns no price.
 * Returns a Map: uppercase symbol → USD price.
 */
export async function fetchPythPricesBySymbol(
  symbols: string[],
): Promise<Map<string, number>> {
  const feedMap = await getFeedMap();

  const symbolToFeedIds: Array<{ symbol: string; feedIds: string[] }> = [];
  for (const sym of symbols) {
    const feedIds = feedMap.get(sym.toLowerCase());
    if (feedIds && feedIds.length > 0) symbolToFeedIds.push({ symbol: sym.toUpperCase(), feedIds });
  }

  if (symbolToFeedIds.length === 0) return new Map();

  // Fetch prices for all feed IDs (regular + overnight fallbacks)
  const allFeedIds = symbolToFeedIds.flatMap((s) => s.feedIds);
  const pricesByFeedId = await fetchPythPricesByFeedId([...new Set(allFeedIds)]);

  const result = new Map<string, number>();
  for (const { symbol, feedIds } of symbolToFeedIds) {
    // Try feeds in order: regular first, then overnight fallback
    for (const feedId of feedIds) {
      const price = pricesByFeedId.get(feedId);
      if (price !== undefined) {
        result.set(symbol, price);
        break;
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Fallback: Ostium live price feed
// ---------------------------------------------------------------------------

/**
 * Fetch all latest prices from Ostium's live price API.
 * Returns a Map keyed by "from+to" (e.g., "AAPLUSD", "XAUUSD", "SPXUSD").
 * Used as a fallback when Pyth doesn't have a price for a symbol.
 */
export async function fetchOstiumFallbackPrices(): Promise<Map<string, number>> {
  try {
    const res = await fetch("https://metadata-backend.ostium.io/PricePublish/latest-prices");
    if (!res.ok) return new Map();
    const data: Array<{ from: string; to: string; mid: number }> = await res.json();
    const map = new Map<string, number>();
    for (const p of data) {
      if (p.mid > 0) map.set(`${p.from}${p.to}`, p.mid);
    }
    return map;
  } catch {
    return new Map();
  }
}

/**
 * For markets still missing prices (markPx === 0), try Ostium's live feed as a fallback.
 * Mutates markets in place. `resolveKey` extracts the Ostium map key from a market;
 * defaults to extracting the base symbol from "venue:SYM-QUOTE" and appending "USD".
 */
export async function applyOstiumFallbackPrices(
  markets: import("../types").ParsedPerpsMarket[],
  resolveKey?: (market: import("../types").ParsedPerpsMarket, ostiumPrices: Map<string, number>) => number,
): Promise<void> {
  const missing = markets.filter((m) => m.markPx === 0);
  if (missing.length === 0) return;

  const ostiumPrices = await fetchOstiumFallbackPrices();
  const defaultResolve = (m: import("../types").ParsedPerpsMarket) => {
    const sym = m.contract.split(":")[1]?.split("-")[0] ?? "";
    return ostiumPrices.get(`${sym}USD`) ?? 0;
  };

  for (const m of missing) {
    const price = resolveKey ? resolveKey(m, ostiumPrices) : defaultResolve(m);
    if (price > 0) {
      m.markPx = price;
      m.oraclePx = price;
      m.midPx = price;
    }
  }
}
