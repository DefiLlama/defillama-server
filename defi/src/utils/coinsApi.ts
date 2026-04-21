const LEGACY_BASE = "https://coins.llama.fi";

function v4Base(): string | null {
  const base = process.env.COINS_API_URL;
  return base ? base.replace(/\/$/, "") : null;
}

function v4Headers(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
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

// Flat shape {coin: {mcap, timestamp}} — matches both legacy Lambda and v4 API.
// Routes to v4 when COINS_API_URL is set, else coins.llama.fi/mcaps.
// legacyApiKey is only applied to the legacy fallback URL.
export async function fetchMcaps(
  coins: string[],
  opts: { legacyApiKey?: string } = {},
): Promise<McapsResponse> {
  if (!coins.length) return {};
  const base = v4Base();
  if (base) {
    const r = await fetch(`${base}/mcaps`, {
      method: "POST",
      body: JSON.stringify({ coins }),
      headers: v4Headers(),
    });
    return r.json();
  }
  const url = opts.legacyApiKey
    ? `${LEGACY_BASE}/mcaps?apikey=${opts.legacyApiKey}`
    : `${LEGACY_BASE}/mcaps`;
  const r = await fetch(url, {
    method: "POST",
    body: JSON.stringify({ coins }),
    headers: { "Content-Type": "application/json" },
  });
  return r.json();
}

export type PricesResponse = {
  coins: { [coin: string]: { decimals?: number; price: number; symbol: string; timestamp: number; confidence?: number } };
};

// Current-price fetch. v4: POST /prices (Redis-current, 24h freshness).
// Legacy: GET /prices/current/:coins with optional apikey + searchWidth.
export async function fetchCurrentPrices(
  coins: string[],
  opts: { searchWidth?: string; legacyApiKey?: string } = {},
): Promise<PricesResponse> {
  if (!coins.length) return { coins: {} };
  const base = v4Base();
  if (base) {
    const r = await fetch(`${base}/prices`, {
      method: "POST",
      body: JSON.stringify({ coins }),
      headers: v4Headers(),
    });
    return r.json();
  }
  const params: string[] = [];
  if (opts.searchWidth) params.push(`searchWidth=${opts.searchWidth}`);
  if (opts.legacyApiKey) params.push(`apikey=${opts.legacyApiKey}`);
  const qs = params.length ? `?${params.join("&")}` : "";
  const r = await fetch(`${LEGACY_BASE}/prices/current/${coins.join(",")}${qs}`);
  return r.json();
}

// GET /tokens/list?chain=<chain> — lists all known tokens for a chain from CH.
// Only available on coins v4 (no legacy equivalent); throws if COINS_API_URL unset.
export async function fetchTokensList(chain: string): Promise<TokenListEntry[]> {
  const base = v4Base();
  if (!base) throw new Error("fetchTokensList: COINS_API_URL not set — tokens list requires the coins v4 API");
  const r = await fetch(`${base}/tokens/list?chain=${encodeURIComponent(chain)}`, { headers: v4Headers() });
  if (!r.ok) throw new Error(`fetchTokensList(${chain}): HTTP ${r.status}`);
  const data: any = await r.json();
  return data?.tokens ?? [];
}
