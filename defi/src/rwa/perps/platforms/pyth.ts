/**
 * Shared Pyth Hermes price fetcher for RWA perps adapters.
 *
 * Two entry points:
 *   fetchPythPricesByFeedId(ids)   — when the caller already has Pyth feed IDs (Avantis)
 *   fetchPythPricesBySymbol(syms)  — maps base symbols ("AAPL") → feed IDs via benchmarks API (gTrade)
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

let feedMapCache: Map<string, string> | null = null;

/**
 * Build a lowercase base symbol → feed ID mapping from the Pyth benchmarks API.
 * Only includes regular USD feeds (excludes .ON/.POST/.PRE overnight/extended variants).
 */
async function getFeedMap(): Promise<Map<string, string>> {
  if (feedMapCache) return feedMapCache;

  try {
    const res = await fetch(PYTH_BENCHMARKS);
    if (!res.ok) throw new Error(`Pyth benchmarks ${res.status}`);
    const feeds: PythBenchmarkFeed[] = await res.json();

    const map = new Map<string, string>();
    for (const f of feeds) {
      const { base, quote_currency, symbol } = f.attributes;
      if (quote_currency !== "USD") continue;
      // Skip overnight/pre/post-market variants
      if (/\.(ON|POST|PRE)$/.test(symbol)) continue;
      const key = base?.toLowerCase();
      if (key && !map.has(key)) {
        map.set(key, "0x" + f.id);
      }
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
 * Returns a Map: uppercase symbol → USD price.
 */
export async function fetchPythPricesBySymbol(
  symbols: string[],
): Promise<Map<string, number>> {
  const feedMap = await getFeedMap();

  const symbolToFeedId: Array<{ symbol: string; feedId: string }> = [];
  for (const sym of symbols) {
    const feedId = feedMap.get(sym.toLowerCase());
    if (feedId) symbolToFeedId.push({ symbol: sym.toUpperCase(), feedId });
  }

  if (symbolToFeedId.length === 0) return new Map();

  const feedIds = symbolToFeedId.map((s) => s.feedId);
  const pricesByFeedId = await fetchPythPricesByFeedId(feedIds);

  const result = new Map<string, number>();
  for (const { symbol, feedId } of symbolToFeedId) {
    const price = pricesByFeedId.get(feedId);
    if (price !== undefined) result.set(symbol, price);
  }
  return result;
}
