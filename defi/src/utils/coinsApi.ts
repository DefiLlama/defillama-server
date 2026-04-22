import axios from "axios";

const LEGACY_BASE = "https://coins.llama.fi";

function v4Base(): string | null {
  const base = process.env.COINS_API_URL;
  return base ? base.replace(/\/$/, "") : null;
}

function v4Headers(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (process.env.COINS_INTERNAL_PASSWORD) headers["x-coins-password"] = process.env.COINS_INTERNAL_PASSWORD;
  return headers;
}

export type McapsResponse = { [coin: string]: { mcap: number; timestamp: number } };

export type TokenListEntry = {
  address: string;
  symbol: string;
  decimals: number;
  canonical_id: string;
};

export type PricesResponse = {
  coins: { [coin: string]: { decimals?: number; price: number; symbol: string; timestamp: number; confidence?: number } };
};

// Routes to v4 when COINS_API_URL is set, else coins.llama.fi/mcaps.
export async function fetchMcaps(
  coins: string[],
  opts: { legacyApiKey?: string } = {},
): Promise<McapsResponse> {
  if (!coins.length) return {};
  const base = v4Base();
  if (base) {
    const r = await axios.post(`${base}/mcaps`, { coins }, { headers: v4Headers() });
    return r.data;
  }
  const r = await axios.post(
    `${LEGACY_BASE}/mcaps`,
    { coins },
    { params: opts.legacyApiKey ? { apikey: opts.legacyApiKey } : undefined },
  );
  return r.data;
}

// Current-price fetch. v4: POST /prices (Redis-current, 24h freshness).
// Legacy: GET /prices/current/:coins with optional apikey + searchWidth.
export async function fetchCurrentPrices(
  coins: string[],
  opts: { searchWidth?: string; legacyApiKey?: string } = {},
): Promise<PricesResponse> {
  if (!coins.length) return { coins: {} };
  const base = v4Base();
  if (base) {
    const r = await axios.post(`${base}/prices`, { coins }, { headers: v4Headers() });
    return r.data;
  }
  const params: Record<string, string> = {};
  if (opts.searchWidth) params.searchWidth = opts.searchWidth;
  if (opts.legacyApiKey) params.apikey = opts.legacyApiKey;
  const r = await axios.get(`${LEGACY_BASE}/prices/current/${coins.join(",")}`, { params });
  return r.data;
}

// GET /tokens/list?chain=<chain> — lists all known tokens for a chain from CH.
// Only available on coins v4 (no legacy equivalent); throws if COINS_API_URL unset.
export async function fetchTokensList(chain: string): Promise<TokenListEntry[]> {
  const base = v4Base();
  if (!base) throw new Error("fetchTokensList: COINS_API_URL not set — tokens list requires the coins v4 API");
  const r = await axios.get(`${base}/tokens/list`, { params: { chain }, headers: v4Headers() });
  return r.data?.tokens ?? [];
}
