import { isCacheDataFresh } from "./getAndStoreTvl";

const SEC_PER_DAY = 24 * 3600;

const validCache = (overrides: Partial<{ usdTvls: number; timestamp: number }> = {}) => ({
  usdTvls: 1_000,
  tokensBalances: { foo: "1" },
  usdTokenBalances: { foo: 1 },
  rawTokenBalances: { foo: "1" },
  timestamp: Math.floor(Date.now() / 1000),
  ...overrides,
});

describe("isCacheDataFresh (per #11354)", () => {
  const ENV_KEYS = ["TVL_FALLBACK_MAX_AGE_SEC", "TVL_FALLBACK_MAX_SHARE"];
  const savedEnv: Record<string, string | undefined> = {};
  beforeAll(() => ENV_KEYS.forEach((k) => (savedEnv[k] = process.env[k])));
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
  });

  it("returns isFresh=true for a fresh cache well under the share threshold", () => {
    const cache = validCache({ usdTvls: 1_000 }); // 1k of 100k = 1%
    expect(isCacheDataFresh(cache, 100_000)).toEqual({ isFresh: true });
  });

  it("rejects a malformed cache (missing required fields)", () => {
    expect(isCacheDataFresh({} as any, 100_000)).toEqual({ isFresh: false, reason: "malformed-cache" });
    expect(isCacheDataFresh({ usdTvls: 1, timestamp: 0 } as any, 100_000)).toEqual({
      isFresh: false,
      reason: "malformed-cache",
    });
  });

  it("rejects a cache older than the default 7-day max age", () => {
    const cache = validCache({ timestamp: Math.floor(Date.now() / 1000) - 7 * SEC_PER_DAY - 1 });
    const result = isCacheDataFresh(cache, 100_000);
    expect(result.isFresh).toBe(false);
    expect(result.reason).toBe("too-old");
    expect(result.invalidCacheTime).toBeGreaterThan(7 * SEC_PER_DAY);
  });

  it("accepts a cache just under the 7-day threshold", () => {
    const cache = validCache({ timestamp: Math.floor(Date.now() / 1000) - 7 * SEC_PER_DAY + 60 });
    expect(isCacheDataFresh(cache, 100_000)).toEqual({ isFresh: true });
  });

  it("rejects a cache at or above the 5% share threshold", () => {
    const cache = validCache({ usdTvls: 6_000 }); // 6k of 100k = 6%
    expect(isCacheDataFresh(cache, 100_000)).toEqual({ isFresh: false, reason: "over-threshold" });

    const exactly5pct = validCache({ usdTvls: 5_000 }); // 5k of 100k = exactly 5%
    expect(isCacheDataFresh(exactly5pct, 100_000)).toEqual({ isFresh: false, reason: "over-threshold" });
  });

  it("honors TVL_FALLBACK_MAX_AGE_SEC override (tighter)", () => {
    process.env.TVL_FALLBACK_MAX_AGE_SEC = "600"; // 10 minutes
    const cache = validCache({ timestamp: Math.floor(Date.now() / 1000) - 700 });
    expect(isCacheDataFresh(cache, 100_000)).toMatchObject({ isFresh: false, reason: "too-old" });
  });

  it("honors TVL_FALLBACK_MAX_AGE_SEC override (looser)", () => {
    process.env.TVL_FALLBACK_MAX_AGE_SEC = String(30 * SEC_PER_DAY);
    const cache = validCache({ timestamp: Math.floor(Date.now() / 1000) - 14 * SEC_PER_DAY });
    expect(isCacheDataFresh(cache, 100_000)).toEqual({ isFresh: true });
  });

  it("honors TVL_FALLBACK_MAX_SHARE override", () => {
    process.env.TVL_FALLBACK_MAX_SHARE = "0.10"; // raise threshold to 10%
    const cache = validCache({ usdTvls: 8_000 }); // 8% — would be rejected at default 5%
    expect(isCacheDataFresh(cache, 100_000)).toEqual({ isFresh: true });
  });

  it("checks staleness before share threshold (too-old wins over over-threshold)", () => {
    const cache = validCache({
      usdTvls: 50_000, // 50% share — over threshold
      timestamp: Math.floor(Date.now() / 1000) - 30 * SEC_PER_DAY, // also too old
    });
    expect(isCacheDataFresh(cache, 100_000)).toMatchObject({ isFresh: false, reason: "too-old" });
  });
});
