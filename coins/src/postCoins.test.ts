import fetch from "node-fetch";

const PROD_BASE = "https://coins.llama.fi";

// representative coins covering different chains and types
const STANDARD_COINS = [
  "ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
  "bsc:0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",      // BUSD
  "coingecko:ethereum",
];

// coingecko-prefixed coins trigger redirect logic
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
  "fakechain:0xdeadbeef",
  "ethereum:0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddead",
];

// case-sensitive chains (solana, bitcoin, eclipse) must NOT be lowercased
const CASE_SENSITIVE_COINS = [
  "solana:So11111111111111111111111111111111111111112",   // Wrapped SOL
  "solana:mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", // mSOL
  "solana:3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
];

// cross-chain mix including case-sensitive chains
const MULTI_CHAIN_COINS = [
  "ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "ethereum:0x0000000000000000000000000000000000000000",   // WETH (valid!)
  "bsc:0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
  "avax:0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
  "polygon:0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  "arbitrum:0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  "solana:So11111111111111111111111111111111111111112",
  "coingecko:ethereum",
  "coingecko:bitcoin",
];

const HISTORICAL_TIMESTAMPS = [1656944730, 1659623130]; // July 4 2022, Aug 4 2022

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Build the coins object for POST historical: { "coin": [ts1, ts2], ... } */
function buildCoinsObj(
  coins: string[],
  timestamps: number[],
): { [coin: string]: number[] } {
  const obj: { [coin: string]: number[] } = {};
  for (const coin of coins) {
    obj[coin] = timestamps;
  }
  return obj;
}

// --- Current endpoints ---

async function getCurrent(coins: string[]) {
  const url = `${PROD_BASE}/prices/current/${coins.join(",")}?searchWidth=12h`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET current ${res.status}`);
  return res.json() as Promise<{ coins: Record<string, any> }>;
}

async function postCurrent(coins: string[]) {
  const res = await fetch(`${PROD_BASE}/prices/multi`, {
    method: "POST",
    body: JSON.stringify({ coins }),
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok)
    throw new Error(`POST current ${res.status}: ${await res.text()}`);
  return res.json() as Promise<{ coins: Record<string, any> }>;
}

// --- Historical endpoints ---

async function getBatchHistorical(coinsObj: { [coin: string]: number[] }) {
  const url = `${PROD_BASE}/batchHistorical?coins=${encodeURIComponent(JSON.stringify(coinsObj))}&searchWidth=12h`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET batchHistorical ${res.status}`);
  return res.json() as Promise<{ coins: Record<string, any> }>;
}

async function postHistorical(coinsObj: { [coin: string]: number[] }) {
  const res = await fetch(`${PROD_BASE}/prices/multiHistorical`, {
    method: "POST",
    body: JSON.stringify({ coins: coinsObj }),
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok)
    throw new Error(`POST historical ${res.status}: ${await res.text()}`);
  return res.json() as Promise<{ coins: Record<string, any> }>;
}

// --- Comparison helpers ---

/**
 * Compare two current-style coin responses (flat price per coin).
 * Allows minor timestamp drift (< 300s) since GET and POST
 * may hit slightly different cache windows.
 */
function compareCurrentResponse(
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

/**
 * Compare two historical-style responses (per-coin price arrays).
 * Prices within each coin are sorted by timestamp before comparison.
 */
function compareHistoricalResponse(
  post: Record<string, any>,
  get: Record<string, any>,
) {
  const postKeys = Object.keys(post).sort();
  const getKeys = Object.keys(get).sort();
  expect(postKeys).toEqual(getKeys);

  for (const key of postKeys) {
    expect(post[key].symbol).toEqual(get[key].symbol);

    const sortByTs = (a: any, b: any) => a.timestamp - b.timestamp;
    const postPrices = [...post[key].prices].sort(sortByTs);
    const getPrices = [...get[key].prices].sort(sortByTs);

    expect(postPrices.length).toEqual(getPrices.length);
    for (let i = 0; i < postPrices.length; i++) {
      expect(postPrices[i].price).toEqual(getPrices[i].price);
      expect(
        Math.abs(postPrices[i].timestamp - getPrices[i].timestamp),
      ).toBeLessThan(300);
    }
  }
}

// ──────────────────────────────────────────────
// POST /prices/multi
// ──────────────────────────────────────────────

describe("POST /prices/multi", () => {
  it("matches GET for standard coins across multiple chains", async () => {
    const [post, get] = await Promise.all([
      postCurrent(STANDARD_COINS),
      getCurrent(STANDARD_COINS),
    ]);
    compareCurrentResponse(post.coins, get.coins);
  }, 30_000);

  it("matches GET for redirect coins (coingecko prefixed)", async () => {
    const [post, get] = await Promise.all([
      postCurrent(REDIRECT_COINS),
      getCurrent(REDIRECT_COINS),
    ]);
    compareCurrentResponse(post.coins, get.coins);
  }, 30_000);

  it("matches GET for mixed case addresses", async () => {
    const [post, get] = await Promise.all([
      postCurrent(MIXED_CASE_COINS),
      getCurrent(MIXED_CASE_COINS),
    ]);
    compareCurrentResponse(post.coins, get.coins);
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
    compareCurrentResponse(post.coins, get.coins);
  }, 30_000);

  it("matches GET for a large multi-chain batch", async () => {
    const [post, get] = await Promise.all([
      postCurrent(MULTI_CHAIN_COINS),
      getCurrent(MULTI_CHAIN_COINS),
    ]);
    compareCurrentResponse(post.coins, get.coins);
  }, 30_000);

  it("matches GET for mix of valid and invalid coins", async () => {
    const mixed = [...STANDARD_COINS, ...INVALID_COINS];
    const [post, get] = await Promise.all([
      postCurrent(mixed),
      getCurrent(mixed),
    ]);
    compareCurrentResponse(post.coins, get.coins);
    expect(Object.keys(post.coins).length).toBeGreaterThan(0);
  }, 30_000);

  it("handles duplicate coins in the array", async () => {
    const duped = [STANDARD_COINS[0], STANDARD_COINS[0], STANDARD_COINS[0]];
    const [post, get] = await Promise.all([
      postCurrent(duped),
      getCurrent(duped),
    ]);
    compareCurrentResponse(post.coins, get.coins);
  }, 30_000);

  it("matches GET for case-sensitive chains (solana)", async () => {
    const [post, get] = await Promise.all([
      postCurrent(CASE_SENSITIVE_COINS),
      getCurrent(CASE_SENSITIVE_COINS),
    ]);
    compareCurrentResponse(post.coins, get.coins);
  }, 30_000);

  it("preserves case for solana addresses (lowercasing would break them)", async () => {
    const coin = "solana:So11111111111111111111111111111111111111112";
    const wrongCase = "solana:so11111111111111111111111111111111111111112";
    const [postCorrect, postWrong] = await Promise.all([
      postCurrent([coin]),
      postCurrent([wrongCase]),
    ]);
    // correct case should return data
    expect(Object.keys(postCorrect.coins).length).toBeGreaterThan(0);
    // wrong case should NOT match the same coin
    const correctKey = Object.keys(postCorrect.coins)[0];
    const wrongKeys = Object.keys(postWrong.coins);
    if (wrongKeys.length > 0) {
      // if it resolves at all, it should be keyed differently
      expect(wrongKeys[0]).not.toEqual(correctKey);
    }
  }, 30_000);

  it("rejects missing body", async () => {
    const res = await fetch(`${PROD_BASE}/prices/multi`, {
      method: "POST",
    });
    expect(res.ok).toBe(false);
  }, 30_000);

  it("rejects invalid JSON body", async () => {
    const res = await fetch(`${PROD_BASE}/prices/multi`, {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });
    expect(res.ok).toBe(false);
  }, 30_000);
});

// ──────────────────────────────────────────────
// POST /prices/multiHistorical
// ──────────────────────────────────────────────

describe("POST /prices/multiHistorical", () => {
  it("matches GET batchHistorical for standard coins with multiple timestamps", async () => {
    const coinsObj = buildCoinsObj(STANDARD_COINS, HISTORICAL_TIMESTAMPS);
    const [post, get] = await Promise.all([
      postHistorical(coinsObj),
      getBatchHistorical(coinsObj),
    ]);
    compareHistoricalResponse(post.coins, get.coins);
  }, 30_000);

  it("matches GET batchHistorical for redirect coins", async () => {
    const coinsObj = buildCoinsObj(REDIRECT_COINS, HISTORICAL_TIMESTAMPS);
    const [post, get] = await Promise.all([
      postHistorical(coinsObj),
      getBatchHistorical(coinsObj),
    ]);
    compareHistoricalResponse(post.coins, get.coins);
  }, 30_000);

  it("matches GET batchHistorical for mixed case addresses", async () => {
    const coinsObj = buildCoinsObj(MIXED_CASE_COINS, HISTORICAL_TIMESTAMPS);
    const [post, get] = await Promise.all([
      postHistorical(coinsObj),
      getBatchHistorical(coinsObj),
    ]);
    compareHistoricalResponse(post.coins, get.coins);
  }, 30_000);

  it("returns empty coins for invalid/nonexistent tokens", async () => {
    const coinsObj = buildCoinsObj(INVALID_COINS, HISTORICAL_TIMESTAMPS);
    const [post, get] = await Promise.all([
      postHistorical(coinsObj),
      getBatchHistorical(coinsObj),
    ]);
    expect(Object.keys(post.coins).length).toBe(0);
    expect(Object.keys(get.coins).length).toBe(0);
  }, 30_000);

  it("returns empty coins for empty object", async () => {
    const post = await postHistorical({});
    expect(post.coins).toEqual({});
  }, 30_000);

  it("matches GET batchHistorical for a single coin with single timestamp", async () => {
    const coinsObj = { [STANDARD_COINS[0]]: [HISTORICAL_TIMESTAMPS[0]] };
    const [post, get] = await Promise.all([
      postHistorical(coinsObj),
      getBatchHistorical(coinsObj),
    ]);
    compareHistoricalResponse(post.coins, get.coins);
  }, 30_000);

  it("returns empty prices for a very old timestamp with no data", async () => {
    const veryOld = 946684800; // Jan 1 2000
    const coinsObj = buildCoinsObj(STANDARD_COINS, [veryOld]);
    const [post, get] = await Promise.all([
      postHistorical(coinsObj),
      getBatchHistorical(coinsObj),
    ]);
    expect(Object.keys(post.coins).length).toBe(0);
    expect(Object.keys(get.coins).length).toBe(0);
  }, 30_000);

  it("matches GET batchHistorical for a recent timestamp", async () => {
    const recent = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const coinsObj = buildCoinsObj(STANDARD_COINS, [recent]);
    const [post, get] = await Promise.all([
      postHistorical(coinsObj),
      getBatchHistorical(coinsObj),
    ]);
    compareHistoricalResponse(post.coins, get.coins);
  }, 30_000);

  it("matches GET batchHistorical for a large multi-chain batch", async () => {
    const coinsObj = buildCoinsObj(MULTI_CHAIN_COINS, HISTORICAL_TIMESTAMPS);
    const [post, get] = await Promise.all([
      postHistorical(coinsObj),
      getBatchHistorical(coinsObj),
    ]);
    compareHistoricalResponse(post.coins, get.coins);
  }, 30_000);

  it("matches GET batchHistorical for mix of valid and invalid coins", async () => {
    const mixed = [...STANDARD_COINS, ...INVALID_COINS];
    const coinsObj = buildCoinsObj(mixed, HISTORICAL_TIMESTAMPS);
    const [post, get] = await Promise.all([
      postHistorical(coinsObj),
      getBatchHistorical(coinsObj),
    ]);
    compareHistoricalResponse(post.coins, get.coins);
    expect(Object.keys(post.coins).length).toBeGreaterThan(0);
  }, 30_000);

  it("matches GET batchHistorical for case-sensitive chains (solana)", async () => {
    const coinsObj = buildCoinsObj(CASE_SENSITIVE_COINS, HISTORICAL_TIMESTAMPS);
    const [post, get] = await Promise.all([
      postHistorical(coinsObj),
      getBatchHistorical(coinsObj),
    ]);
    compareHistoricalResponse(post.coins, get.coins);
  }, 30_000);

  it("preserves case for solana addresses in historical lookups", async () => {
    const coin = "solana:So11111111111111111111111111111111111111112";
    const wrongCase = "solana:so11111111111111111111111111111111111111112";
    const [postCorrect, postWrong] = await Promise.all([
      postHistorical({ [coin]: HISTORICAL_TIMESTAMPS }),
      postHistorical({ [wrongCase]: HISTORICAL_TIMESTAMPS }),
    ]);
    // correct case should return data
    expect(Object.keys(postCorrect.coins).length).toBeGreaterThan(0);
    // wrong case should NOT match the same coin
    const correctKey = Object.keys(postCorrect.coins)[0];
    const wrongKeys = Object.keys(postWrong.coins);
    if (wrongKeys.length > 0) {
      expect(wrongKeys[0]).not.toEqual(correctKey);
    }
  }, 30_000);

  it("supports different timestamps per coin", async () => {
    const coinsObj = {
      [STANDARD_COINS[0]]: [HISTORICAL_TIMESTAMPS[0]],
      [STANDARD_COINS[1]]: [HISTORICAL_TIMESTAMPS[1]],
      [STANDARD_COINS[2]]: HISTORICAL_TIMESTAMPS,
    };
    const [post, get] = await Promise.all([
      postHistorical(coinsObj),
      getBatchHistorical(coinsObj),
    ]);
    compareHistoricalResponse(post.coins, get.coins);
  }, 30_000);

  it("rejects missing body", async () => {
    const res = await fetch(`${PROD_BASE}/prices/multiHistorical`, {
      method: "POST",
    });
    expect(res.ok).toBe(false);
  }, 30_000);

  it("rejects invalid JSON body", async () => {
    const res = await fetch(`${PROD_BASE}/prices/multiHistorical`, {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });
    expect(res.ok).toBe(false);
  }, 30_000);
});
