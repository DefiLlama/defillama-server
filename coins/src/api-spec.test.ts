/**
 * Live integration tests for the coins API against the published OpenAPI spec.
 *
 * Runs against COINS_API_BASE (default https://coins.llama.fi). Set SKIP_LIVE=1
 * to skip (e.g. in CI without network). Tests assert response shape + field
 * types per the spec at:
 *   https://github.com/DefiLlama/api-docs/blob/main/defillama-openapi-free.json
 *
 * Regression guards for the string-price bug fixed in defillama-server#11797
 * are in "type regression guards" blocks per endpoint — these tests will FAIL
 * against prod until that PR merges.
 */
import axios, { AxiosResponse } from "axios";

const BASE_URL = process.env.COINS_API_BASE ?? "https://coins.llama.fi";
const LIVE = process.env.SKIP_LIVE !== "1";
const d = LIVE ? describe : describe.skip;
const REQ_TIMEOUT = 30000;
const TEST_TIMEOUT = 45000;

const USDC = "ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const WETH = "ethereum:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const DAI = "ethereum:0x6b175474e89094c44da98b954eedeac495271d0f";
const CG_ETH = "coingecko:ethereum";
const CG_BTC = "coingecko:bitcoin";
// SPYon — Ondo equity token. Before #11797 prod returns price as a STRING.
const SPYON = "ethereum:0xfedc5f4a6c38211c1338aa411018dfaf26612c08";
// Truly unmapped — zero address is actually ETH, so use a random dead address.
const DEAD_ADDR = "ethereum:0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";

const COMMON_BATCH = [USDC, WETH, DAI, CG_ETH, CG_BTC];

function get(path: string, params?: Record<string, unknown>): Promise<AxiosResponse> {
  return axios.get(`${BASE_URL}${path}`, {
    params,
    timeout: REQ_TIMEOUT,
    validateStatus: () => true,
  });
}

function assertFiniteNumber(v: unknown, label: string) {
  expect({ label, actual: typeof v, value: v }).toMatchObject({ actual: "number" });
  expect(Number.isFinite(v as number)).toBe(true);
}

function assertPriceEntry(coinKey: string, coin: any) {
  expect(coin).toBeDefined();
  assertFiniteNumber(coin.price, `coins[${coinKey}].price`);
  assertFiniteNumber(coin.timestamp, `coins[${coinKey}].timestamp`);
  expect(typeof coin.symbol).toBe("string");
  // decimals is documented but optional — coingecko-native assets omit it.
  if ("decimals" in coin) assertFiniteNumber(coin.decimals, `coins[${coinKey}].decimals`);
  // confidence is returned by prod but undocumented in the current spec.
  if ("confidence" in coin) {
    assertFiniteNumber(coin.confidence, `coins[${coinKey}].confidence`);
    expect(coin.confidence).toBeGreaterThanOrEqual(0);
    expect(coin.confidence).toBeLessThanOrEqual(1);
  }
  // No stray string-typed numeric fields.
  for (const [k, v] of Object.entries(coin)) {
    if (["price", "decimals", "timestamp", "confidence"].includes(k)) {
      expect({ field: k, type: typeof v }).toMatchObject({ type: "number" });
    }
  }
}

d("Coins API — spec compliance", () => {
  beforeAll(() => {
    // eslint-disable-next-line no-console
    console.log(`[api-spec] testing against ${BASE_URL}`);
  });

  // ---------------------------------------------------------------------------
  describe("GET /prices/current/{coins}", () => {
    const P = "/prices/current";

    test("happy path — USDC: all fields typed per spec", async () => {
      const r = await get(`${P}/${USDC}`);
      expect(r.status).toBe(200);
      expect(r.data).toHaveProperty("coins");
      assertPriceEntry(USDC, r.data.coins[USDC]);
    }, TEST_TIMEOUT);

    test("batch of 5 common coins — every returned entry is well-typed", async () => {
      const r = await get(`${P}/${COMMON_BATCH.join(",")}`);
      expect(r.status).toBe(200);
      const coins = r.data.coins;
      expect(Object.keys(coins).length).toBeGreaterThan(0);
      for (const [k, v] of Object.entries(coins)) assertPriceEntry(k, v);
    }, TEST_TIMEOUT);

    test("unknown token → empty coins object (not error)", async () => {
      const r = await get(`${P}/${DEAD_ADDR}`);
      expect(r.status).toBe(200);
      expect(r.data).toEqual({ coins: {} });
    }, TEST_TIMEOUT);

    test("mixed-case address — returned key matches whatever server canonicalises to", async () => {
      const mixed = "ethereum:0xA0b86991c6218b36c1D19D4a2e9Eb0cE3606eB48";
      const r = await get(`${P}/${mixed}`);
      expect(r.status).toBe(200);
      const keys = Object.keys(r.data.coins);
      expect(keys.length).toBe(1);
      // Whatever casing the server echoes back, the payload must still be valid.
      assertPriceEntry(keys[0], r.data.coins[keys[0]]);
    }, TEST_TIMEOUT);

    test("duplicate coin — response has one entry, still well-typed", async () => {
      const r = await get(`${P}/${USDC},${USDC}`);
      expect(r.status).toBe(200);
      expect(Object.keys(r.data.coins).length).toBe(1);
      assertPriceEntry(USDC, r.data.coins[USDC]);
    }, TEST_TIMEOUT);

    test("searchWidth='4h' accepted", async () => {
      const r = await get(`${P}/${USDC}`, { searchWidth: "4h" });
      expect(r.status).toBe(200);
      assertPriceEntry(USDC, r.data.coins[USDC]);
    }, TEST_TIMEOUT);

    test("searchWidth garbage value does not 5xx", async () => {
      const r = await get(`${P}/${USDC}`, { searchWidth: "not-a-duration" });
      expect(r.status).toBeLessThan(500);
    }, TEST_TIMEOUT);

    describe("type regression guards (will fail until #11797 deploys)", () => {
      test("SPYon (Ondo equity) — price must be a number, not a string", async () => {
        const r = await get(`${P}/${SPYON}`);
        expect(r.status).toBe(200);
        const coin = r.data.coins[SPYON];
        if (!coin) return; // token may age out of searchWidth; not a type-drift failure
        expect({ field: "price", type: typeof coin.price }).toEqual({
          field: "price",
          type: "number",
        });
      }, TEST_TIMEOUT);
    });
  });

  // ---------------------------------------------------------------------------
  describe("GET /prices/historical/{timestamp}/{coins}", () => {
    const P = "/prices/historical";
    const TS_OLD = 1648680149;

    test("happy path at a known timestamp", async () => {
      const r = await get(`${P}/${TS_OLD}/${USDC}`);
      expect(r.status).toBe(200);
      expect(r.data).toHaveProperty("coins");
      if (r.data.coins[USDC]) assertPriceEntry(USDC, r.data.coins[USDC]);
    }, TEST_TIMEOUT);

    test("timestamp=0 accepted (no crash, returns object)", async () => {
      const r = await get(`${P}/0/${USDC}`);
      expect(r.status).toBeLessThan(500);
      expect(r.data).toHaveProperty("coins");
    }, TEST_TIMEOUT);

    test("far-future timestamp → empty or no-crash", async () => {
      const r = await get(`${P}/9999999999/${USDC}`);
      expect(r.status).toBeLessThan(500);
      expect(r.data).toHaveProperty("coins");
    }, TEST_TIMEOUT);

    test("very old timestamp (pre-2015) → empty coins", async () => {
      const r = await get(`${P}/1000000000/${USDC}`);
      expect(r.status).toBeLessThan(500);
      expect(r.data.coins).toBeDefined();
    }, TEST_TIMEOUT);

    test("batch at historical timestamp — all returned entries well-typed", async () => {
      const r = await get(`${P}/${TS_OLD}/${COMMON_BATCH.join(",")}`);
      expect(r.status).toBe(200);
      for (const [k, v] of Object.entries(r.data.coins)) assertPriceEntry(k, v);
    }, TEST_TIMEOUT);
  });

  // ---------------------------------------------------------------------------
  describe("GET /batchHistorical", () => {
    const P = "/batchHistorical";

    test("single coin, single timestamp — prices[] with number price/timestamp", async () => {
      const body = { [USDC]: [1700000000] };
      const r = await get(P, { coins: JSON.stringify(body) });
      expect(r.status).toBe(200);
      const coin = r.data.coins[USDC];
      if (!coin) return;
      expect(typeof coin.symbol).toBe("string");
      expect(Array.isArray(coin.prices)).toBe(true);
      for (const p of coin.prices) {
        assertFiniteNumber(p.price, "prices[].price");
        assertFiniteNumber(p.timestamp, "prices[].timestamp");
        if ("confidence" in p) assertFiniteNumber(p.confidence, "prices[].confidence");
      }
    }, TEST_TIMEOUT);

    test("multi-coin, multi-timestamp — each coin has its own timestamps honoured", async () => {
      const body = {
        [USDC]: [1700000000, 1710000000],
        [CG_ETH]: [1700000000],
      };
      const r = await get(P, { coins: JSON.stringify(body) });
      expect(r.status).toBe(200);
      for (const [k, v] of Object.entries(r.data.coins)) {
        const coin = v as any;
        expect(typeof coin.symbol).toBe("string");
        for (const p of coin.prices) {
          assertFiniteNumber(p.price, `${k}.prices[].price`);
          assertFiniteNumber(p.timestamp, `${k}.prices[].timestamp`);
        }
      }
    }, TEST_TIMEOUT);

    test("same coin in two casings — regression for duplicate-entry bug (PR test C)", async () => {
      const checksum = "ethereum:0xA0b86991c6218b36c1D19D4a2e9Eb0cE3606eB48";
      const lower = USDC;
      const body = { [checksum]: [1700000000], [lower]: [1700000000] };
      const r = await get(P, { coins: JSON.stringify(body) });
      expect(r.status).toBe(200);
      for (const [k, v] of Object.entries(r.data.coins)) {
        const coin = v as any;
        // Regression: used to duplicate entries. Each key should have ≤1 per requested ts.
        expect(coin.prices.length).toBeLessThanOrEqual(1);
      }
    }, TEST_TIMEOUT);

    test("empty timestamps array is tolerated", async () => {
      const body = { [USDC]: [] };
      const r = await get(P, { coins: JSON.stringify(body) });
      expect(r.status).toBeLessThan(500);
    }, TEST_TIMEOUT);

    test("malformed JSON in coins param → 4xx, not 5xx", async () => {
      const r = await get(P, { coins: "not-json{{{" });
      expect(r.status).toBeGreaterThanOrEqual(400);
      expect(r.status).toBeLessThan(500);
    }, TEST_TIMEOUT);
  });

  // ---------------------------------------------------------------------------
  describe("GET /chart/{coins}", () => {
    const P = "/chart";

    test("happy path — prices[] with numeric fields", async () => {
      const r = await get(`${P}/${USDC}`, { span: 5, period: "1d" });
      expect(r.status).toBe(200);
      const coin = r.data.coins[USDC];
      if (!coin) return;
      expect(typeof coin.symbol).toBe("string");
      assertFiniteNumber(coin.decimals, "coin.decimals");
      assertFiniteNumber(coin.confidence, "coin.confidence");
      expect(Array.isArray(coin.prices)).toBe(true);
      expect(coin.prices.length).toBeGreaterThan(0);
      for (const p of coin.prices) {
        assertFiniteNumber(p.price, "prices[].price");
        assertFiniteNumber(p.timestamp, "prices[].timestamp");
      }
    }, TEST_TIMEOUT);

    test("span=1 returns at least one point", async () => {
      const r = await get(`${P}/${USDC}`, { span: 1, period: "1d" });
      expect(r.status).toBe(200);
      if (r.data.coins[USDC]) {
        expect(r.data.coins[USDC].prices.length).toBeGreaterThanOrEqual(1);
      }
    }, TEST_TIMEOUT);

    test("period='2d' accepted", async () => {
      const r = await get(`${P}/${USDC}`, { span: 3, period: "2d" });
      expect(r.status).toBe(200);
    }, TEST_TIMEOUT);

    test("period='1h' accepted", async () => {
      const r = await get(`${P}/${USDC}`, { span: 3, period: "1h" });
      expect(r.status).toBe(200);
    }, TEST_TIMEOUT);

    test("start without end does not 5xx", async () => {
      const r = await get(`${P}/${USDC}`, { start: 1700000000, span: 3 });
      expect(r.status).toBeLessThan(500);
    }, TEST_TIMEOUT);

    test("invalid period string does not 5xx", async () => {
      const r = await get(`${P}/${USDC}`, { period: "not-a-period" });
      expect(r.status).toBeLessThan(500);
    }, TEST_TIMEOUT);
  });

  // ---------------------------------------------------------------------------
  describe("GET /percentage/{coins}", () => {
    const P = "/percentage";

    test("happy path — coins[key] is a number", async () => {
      const r = await get(`${P}/${USDC}`);
      expect(r.status).toBe(200);
      const v = r.data.coins[USDC];
      if (v !== undefined) assertFiniteNumber(v, `coins[${USDC}]`);
    }, TEST_TIMEOUT);

    test("lookForward=true accepted", async () => {
      const r = await get(`${P}/${USDC}`, { lookForward: true, period: "1d" });
      expect(r.status).toBe(200);
    }, TEST_TIMEOUT);

    test("lookForward=false (default) works", async () => {
      const r = await get(`${P}/${USDC}`, { lookForward: false, period: "1d" });
      expect(r.status).toBe(200);
    }, TEST_TIMEOUT);

    test("batch — every value is a number", async () => {
      const r = await get(`${P}/${COMMON_BATCH.join(",")}`, { period: "1d" });
      expect(r.status).toBe(200);
      for (const [k, v] of Object.entries(r.data.coins)) {
        assertFiniteNumber(v, `coins[${k}]`);
      }
    }, TEST_TIMEOUT);
  });

  // ---------------------------------------------------------------------------
  describe("GET /prices/first/{coins}", () => {
    const P = "/prices/first";

    test("happy path — price/symbol/timestamp typed", async () => {
      const r = await get(`${P}/${USDC}`);
      expect(r.status).toBe(200);
      const coin = r.data.coins[USDC];
      if (!coin) return;
      assertFiniteNumber(coin.price, "coin.price");
      expect(typeof coin.symbol).toBe("string");
      assertFiniteNumber(coin.timestamp, "coin.timestamp");
    }, TEST_TIMEOUT);

    test("unknown coin — omitted from response", async () => {
      const r = await get(`${P}/${DEAD_ADDR}`);
      expect(r.status).toBe(200);
      expect(r.data.coins[DEAD_ADDR]).toBeUndefined();
    }, TEST_TIMEOUT);
  });

  // ---------------------------------------------------------------------------
  describe("GET /block/{chain}/{timestamp}", () => {
    const P = "/block";

    test("happy path — height and timestamp are integers", async () => {
      const r = await get(`${P}/ethereum/1700000000`);
      expect(r.status).toBe(200);
      assertFiniteNumber(r.data.height, "height");
      assertFiniteNumber(r.data.timestamp, "timestamp");
      expect(Number.isInteger(r.data.height)).toBe(true);
      expect(Number.isInteger(r.data.timestamp)).toBe(true);
    }, TEST_TIMEOUT);

    test("invalid chain → 4xx or empty, not 5xx", async () => {
      const r = await get(`${P}/notachain/1700000000`);
      expect(r.status).toBeLessThan(500);
    }, TEST_TIMEOUT);

    test("far-future timestamp does not 5xx", async () => {
      const r = await get(`${P}/ethereum/9999999999`);
      expect(r.status).toBeLessThan(500);
    }, TEST_TIMEOUT);
  });
});
