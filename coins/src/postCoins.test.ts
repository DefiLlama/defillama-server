import fetch from "node-fetch";

const PROD_BASE = "https://coins.llama.fi";

// representative coins covering different chains and types
const STANDARD_COINS = [
  "ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
  "bsc:0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",      // BUSD
  "coingecko:ethereum",
];

// coingecko-prefixed coins typically trigger redirect logic
const REDIRECT_COINS = [
  "coingecko:ethereum",
  "coingecko:bitcoin",
];

// same address, different casing
const MIXED_CASE_COINS = [
  "ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
];

// tokens that should not resolve
const INVALID_COINS = [
  "ethereum:0x0000000000000000000000000000000000000000",
  "fakechain:0xdeadbeef",
];

// cross-chain mix
const MULTI_CHAIN_COINS = [
  "ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "bsc:0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
  "avax:0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
  "polygon:0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  "arbitrum:0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  "coingecko:ethereum",
  "coingecko:bitcoin",
];

const HISTORICAL_TIMESTAMP = 1656944730; // July 4 2022

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

async function getCurrent(coins: string[]) {
  const url = `${PROD_BASE}/prices/current/${coins.join(",")}?searchWidth=12h`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET current ${res.status}`);
  return res.json() as Promise<{ coins: Record<string, any> }>;
}

async function postCurrent(coins: string[]) {
  const res = await fetch(`${PROD_BASE}/prices/current`, {
    method: "POST",
    body: JSON.stringify({ coins }),
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`POST current ${res.status}: ${await res.text()}`);
  return res.json() as Promise<{ coins: Record<string, any> }>;
}

async function getHistorical(coins: string[], timestamp: number) {
  const url = `${PROD_BASE}/prices/historical/${timestamp}/${coins.join(",")}?searchWidth=12h`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET historical ${res.status}`);
  return res.json() as Promise<{ coins: Record<string, any> }>;
}

async function postHistorical(coins: string[], timestamp: number) {
  const res = await fetch(`${PROD_BASE}/prices/historical`, {
    method: "POST",
    body: JSON.stringify({ coins, timestamp }),
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`POST historical ${res.status}: ${await res.text()}`);
  return res.json() as Promise<{ coins: Record<string, any> }>;
}

/**
 * Compare two coins response objects.
 * Allows minor timestamp drift (< 300s) since GET and POST may hit
 * slightly different cache windows.
 */
function compareCoinsResponse(
  post: Record<string, any>,
  get: Record<string, any>,
) {
  const postKeys = Object.keys(post).sort();
  const getKeys = Object.keys(get).sort();
  expect(postKeys).toEqual(getKeys);

  for (const key of postKeys) {
    expect(post[key].price).toEqual(get[key].price);
    expect(post[key].decimals).toEqual(get[key].decimals);
    expect(post[key].symbol).toEqual(get[key].symbol);
    expect(post[key].confidence).toEqual(get[key].confidence);
    if (post[key].timestamp && get[key].timestamp) {
      expect(
        Math.abs(post[key].timestamp - get[key].timestamp),
      ).toBeLessThan(300);
    }
  }
}

// ──────────────────────────────────────────────
// POST /prices/current
// ──────────────────────────────────────────────

describe("POST /prices/current", () => {
  it("matches GET for standard coins across multiple chains", async () => {
    const [post, get] = await Promise.all([
      postCurrent(STANDARD_COINS),
      getCurrent(STANDARD_COINS),
    ]);
    compareCoinsResponse(post.coins, get.coins);
  }, 30_000);

  it("matches GET for redirect coins (coingecko prefixed)", async () => {
    const [post, get] = await Promise.all([
      postCurrent(REDIRECT_COINS),
      getCurrent(REDIRECT_COINS),
    ]);
    compareCoinsResponse(post.coins, get.coins);
  }, 30_000);

  it("matches GET for mixed case addresses", async () => {
    const [post, get] = await Promise.all([
      postCurrent(MIXED_CASE_COINS),
      getCurrent(MIXED_CASE_COINS),
    ]);
    compareCoinsResponse(post.coins, get.coins);
  }, 30_000);

  it("returns empty coins for invalid/nonexistent tokens", async () => {
    const [post, get] = await Promise.all([
      postCurrent(INVALID_COINS),
      getCurrent(INVALID_COINS),
    ]);
    expect(Object.keys(post.coins).length).toBe(0);
    expect(Object.keys(get.coins).length).toBe(0);
  }, 30_000);

  it("returns empty coins for empty array", async () => {
    const post = await postCurrent([]);
    expect(post.coins).toEqual({});
  }, 30_000);

  it("matches GET for a single coin", async () => {
    const single = [STANDARD_COINS[0]];
    const [post, get] = await Promise.all([
      postCurrent(single),
      getCurrent(single),
    ]);
    compareCoinsResponse(post.coins, get.coins);
  }, 30_000);

  it("matches GET for a large multi-chain batch", async () => {
    const [post, get] = await Promise.all([
      postCurrent(MULTI_CHAIN_COINS),
      getCurrent(MULTI_CHAIN_COINS),
    ]);
    compareCoinsResponse(post.coins, get.coins);
  }, 30_000);

  it("matches GET for mix of valid and invalid coins", async () => {
    const mixed = [...STANDARD_COINS, ...INVALID_COINS];
    const [post, get] = await Promise.all([
      postCurrent(mixed),
      getCurrent(mixed),
    ]);
    compareCoinsResponse(post.coins, get.coins);
    expect(Object.keys(post.coins).length).toBeGreaterThan(0);
  }, 30_000);

  it("handles duplicate coins in the array", async () => {
    const duped = [STANDARD_COINS[0], STANDARD_COINS[0], STANDARD_COINS[0]];
    const [post, get] = await Promise.all([
      postCurrent(duped),
      getCurrent(duped),
    ]);
    compareCoinsResponse(post.coins, get.coins);
  }, 30_000);

  it("rejects missing body (no body at all)", async () => {
    const res = await fetch(`${PROD_BASE}/prices/current`, {
      method: "POST",
    });
    // should return 400 or 500 with error message
    expect(res.ok).toBe(false);
  }, 30_000);

  it("rejects invalid JSON body", async () => {
    const res = await fetch(`${PROD_BASE}/prices/current`, {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });
    expect(res.ok).toBe(false);
  }, 30_000);
});

// ──────────────────────────────────────────────
// POST /prices/historical
// ──────────────────────────────────────────────

describe("POST /prices/historical", () => {
  it("matches GET for standard coins", async () => {
    const [post, get] = await Promise.all([
      postHistorical(STANDARD_COINS, HISTORICAL_TIMESTAMP),
      getHistorical(STANDARD_COINS, HISTORICAL_TIMESTAMP),
    ]);
    compareCoinsResponse(post.coins, get.coins);
  }, 30_000);

  it("matches GET for redirect coins (coingecko prefixed)", async () => {
    const [post, get] = await Promise.all([
      postHistorical(REDIRECT_COINS, HISTORICAL_TIMESTAMP),
      getHistorical(REDIRECT_COINS, HISTORICAL_TIMESTAMP),
    ]);
    compareCoinsResponse(post.coins, get.coins);
  }, 30_000);

  it("matches GET for mixed case addresses", async () => {
    const [post, get] = await Promise.all([
      postHistorical(MIXED_CASE_COINS, HISTORICAL_TIMESTAMP),
      getHistorical(MIXED_CASE_COINS, HISTORICAL_TIMESTAMP),
    ]);
    compareCoinsResponse(post.coins, get.coins);
  }, 30_000);

  it("returns empty coins for invalid/nonexistent tokens", async () => {
    const [post, get] = await Promise.all([
      postHistorical(INVALID_COINS, HISTORICAL_TIMESTAMP),
      getHistorical(INVALID_COINS, HISTORICAL_TIMESTAMP),
    ]);
    expect(Object.keys(post.coins).length).toBe(0);
    expect(Object.keys(get.coins).length).toBe(0);
  }, 30_000);

  it("returns empty coins for empty array", async () => {
    const post = await postHistorical([], HISTORICAL_TIMESTAMP);
    expect(post.coins).toEqual({});
  }, 30_000);

  it("matches GET for a single coin", async () => {
    const single = [STANDARD_COINS[0]];
    const [post, get] = await Promise.all([
      postHistorical(single, HISTORICAL_TIMESTAMP),
      getHistorical(single, HISTORICAL_TIMESTAMP),
    ]);
    compareCoinsResponse(post.coins, get.coins);
  }, 30_000);

  it("returns empty for a very old timestamp with no data", async () => {
    const veryOld = 946684800; // Jan 1 2000
    const [post, get] = await Promise.all([
      postHistorical(STANDARD_COINS, veryOld),
      getHistorical(STANDARD_COINS, veryOld),
    ]);
    expect(Object.keys(post.coins).length).toBe(0);
    expect(Object.keys(get.coins).length).toBe(0);
  }, 30_000);

  it("matches GET for a recent timestamp", async () => {
    const recent = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const [post, get] = await Promise.all([
      postHistorical(STANDARD_COINS, recent),
      getHistorical(STANDARD_COINS, recent),
    ]);
    compareCoinsResponse(post.coins, get.coins);
  }, 30_000);

  it("matches GET for a large multi-chain batch", async () => {
    const [post, get] = await Promise.all([
      postHistorical(MULTI_CHAIN_COINS, HISTORICAL_TIMESTAMP),
      getHistorical(MULTI_CHAIN_COINS, HISTORICAL_TIMESTAMP),
    ]);
    compareCoinsResponse(post.coins, get.coins);
  }, 30_000);

  it("matches GET for mix of valid and invalid coins", async () => {
    const mixed = [...STANDARD_COINS, ...INVALID_COINS];
    const [post, get] = await Promise.all([
      postHistorical(mixed, HISTORICAL_TIMESTAMP),
      getHistorical(mixed, HISTORICAL_TIMESTAMP),
    ]);
    compareCoinsResponse(post.coins, get.coins);
    expect(Object.keys(post.coins).length).toBeGreaterThan(0);
  }, 30_000);

  it("handles duplicate coins in the array", async () => {
    const duped = [STANDARD_COINS[0], STANDARD_COINS[0], STANDARD_COINS[0]];
    const [post, get] = await Promise.all([
      postHistorical(duped, HISTORICAL_TIMESTAMP),
      getHistorical(duped, HISTORICAL_TIMESTAMP),
    ]);
    compareCoinsResponse(post.coins, get.coins);
  }, 30_000);

  it("rejects missing body", async () => {
    const res = await fetch(`${PROD_BASE}/prices/historical`, {
      method: "POST",
    });
    expect(res.ok).toBe(false);
  }, 30_000);

  it("rejects invalid JSON body", async () => {
    const res = await fetch(`${PROD_BASE}/prices/historical`, {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });
    expect(res.ok).toBe(false);
  }, 30_000);
});
