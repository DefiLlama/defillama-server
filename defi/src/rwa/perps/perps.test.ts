import { toFiniteNumberOrZero, perpsSlug, computeProtocolFees, groupBy } from "./utils";
import { fileNameNormalizer, mergeHistoricalData } from "./file-cache";
import {
  getMarketId,
  getMarketMetadata,
  setMarketMetadata,
  hasMarketMetadata,
  type MarketMetadata,
} from "./constants";
import { HYPERLIQUID_MAKER_FEE, HYPERLIQUID_TAKER_FEE, HYPERLIQUID_DEPLOYER_SHARE } from "./platforms/hyperliquid";
import {
  parseMetaAndAssetCtxs,
  parseFundingHistory,
  type MetaAndAssetCtxsResponse,
  type FundingHistoryEntry,
} from "./platforms/hyperliquid";

// ── utils.ts ──────────────────────────────────────────────────────────────────

describe("toFiniteNumberOrZero", () => {
  it("returns number as-is", () => {
    expect(toFiniteNumberOrZero(42)).toBe(42);
    expect(toFiniteNumberOrZero(0)).toBe(0);
    expect(toFiniteNumberOrZero(-3.14)).toBe(-3.14);
  });

  it("parses numeric strings", () => {
    expect(toFiniteNumberOrZero("100")).toBe(100);
    expect(toFiniteNumberOrZero("3.14")).toBe(3.14);
  });

  it("returns 0 for non-finite values", () => {
    expect(toFiniteNumberOrZero(NaN)).toBe(0);
    expect(toFiniteNumberOrZero(Infinity)).toBe(0);
    expect(toFiniteNumberOrZero(-Infinity)).toBe(0);
    expect(toFiniteNumberOrZero(undefined)).toBe(0);
    expect(toFiniteNumberOrZero(null)).toBe(0);
    expect(toFiniteNumberOrZero("abc")).toBe(0);
    expect(toFiniteNumberOrZero("")).toBe(0);
  });
});

describe("perpsSlug", () => {
  it("lowercases and slugifies", () => {
    expect(perpsSlug("Hyperliquid")).toBe("hyperliquid");
    expect(perpsSlug("My Venue Name")).toBe("my-venue-name");
  });

  it("strips special chars", () => {
    expect(perpsSlug("trade[XYZ]")).toBe("trade-xyz");
    expect(perpsSlug("foo---bar")).toBe("foo-bar");
  });

  it("handles empty/undefined", () => {
    expect(perpsSlug("")).toBe("");
    expect(perpsSlug()).toBe("");
  });

  it("decodes URI components", () => {
    expect(perpsSlug("hello%20world")).toBe("hello-world");
  });
});

describe("computeProtocolFees", () => {
  it("computes volume * takerFee * deployerShare", () => {
    expect(computeProtocolFees(1_000_000, 0.0005, 0.5)).toBe(250);
    expect(computeProtocolFees(0, 0.0005, 0.5)).toBe(0);
  });
});

describe("groupBy", () => {
  it("groups items by key function", () => {
    const items = [
      { venue: "a", coin: "BTC" },
      { venue: "a", coin: "ETH" },
      { venue: "b", coin: "SOL" },
    ];
    const grouped = groupBy(items, (i) => i.venue);
    expect(Object.keys(grouped)).toEqual(["a", "b"]);
    expect(grouped["a"]).toHaveLength(2);
    expect(grouped["b"]).toHaveLength(1);
  });

  it("returns empty object for empty array", () => {
    expect(groupBy([], () => "x")).toEqual({});
  });
});

// ── constants.ts ──────────────────────────────────────────────────────────────

describe("market metadata store", () => {
  const meta: MarketMetadata = {
    referenceAsset: "Tesla",
    referenceAssetGroup: "US Equities",
    assetClass: "Single stock synthetic perp",
    parentPlatform: "Hyperliquid",
    pair: "TSLA/USD",
    marginAsset: "USDC",
    settlementAsset: "USDC",
    category: ["Equity"],
    issuer: null,
    website: null,
    oracleProvider: "Pyth",
    description: null,
    accessModel: "Permissionless",
    rwaClassification: "Programmable Finance",
    makerFeeRate: HYPERLIQUID_MAKER_FEE,
    takerFeeRate: HYPERLIQUID_TAKER_FEE,
    deployerFeeShare: HYPERLIQUID_DEPLOYER_SHARE,
  };

  it("set/get/has round-trips", () => {
    setMarketMetadata("TSLA", meta);
    expect(hasMarketMetadata("TSLA")).toBe(true);
    expect(hasMarketMetadata("tsla")).toBe(true);
    expect(getMarketMetadata("TSLA")).toEqual(meta);
    expect(getMarketMetadata("tsla")).toEqual(meta);
  });

  it("returns null for unknown coin", () => {
    expect(getMarketMetadata("DOESNOTEXIST")).toBeNull();
    expect(hasMarketMetadata("DOESNOTEXIST")).toBe(false);
  });
});

describe("getMarketId", () => {
  it("lowercases coin name", () => {
    expect(getMarketId("TSLA")).toBe("tsla");
    expect(getMarketId("aapl")).toBe("aapl");
  });
});

// ── hyperliquid.ts parsers ────────────────────────────────────────────────────

describe("parseMetaAndAssetCtxs", () => {
  const response: MetaAndAssetCtxsResponse = {
    meta: {
      universe: [
        { name: "TSLA", szDecimals: 2, maxLeverage: 5 },
        { name: "AAPL", szDecimals: 3, maxLeverage: 10 },
      ],
    },
    assetCtxs: [
      {
        dayNtlVlm: "5000000",
        funding: "0.0001",
        impactPxs: [],
        markPx: "250.5",
        midPx: "250.4",
        openInterest: "1000",
        oraclePx: "250.3",
        premium: "0.0002",
        prevDayPx: "245.0",
      },
      {
        dayNtlVlm: "3000000",
        funding: "-0.00005",
        impactPxs: [],
        markPx: "190.0",
        midPx: "189.9",
        openInterest: "500",
        oraclePx: "189.8",
        premium: "-0.0001",
        prevDayPx: "190.0",
      },
    ],
  };

  it("parses all markets from response", () => {
    const markets = parseMetaAndAssetCtxs(response, "TestVenue");
    expect(markets).toHaveLength(2);
  });

  it("maps fields correctly", () => {
    const [tsla] = parseMetaAndAssetCtxs(response, "TestVenue");
    expect(tsla.coin).toBe("TSLA");
    expect(tsla.venue).toBe("TestVenue");
    expect(tsla.markPx).toBe(250.5);
    expect(tsla.oraclePx).toBe(250.3);
    expect(tsla.midPx).toBe(250.4);
    expect(tsla.prevDayPx).toBe(245.0);
    expect(tsla.openInterest).toBe(1000);
    expect(tsla.volume24h).toBe(5_000_000);
    expect(tsla.fundingRate).toBe(0.0001);
    expect(tsla.premium).toBe(0.0002);
    expect(tsla.maxLeverage).toBe(5);
    expect(tsla.szDecimals).toBe(2);
  });

  it("computes priceChange24h correctly", () => {
    const [tsla, aapl] = parseMetaAndAssetCtxs(response, "TestVenue");
    // (250.5 - 245) / 245 * 100 ≈ 2.2449%
    expect(tsla.priceChange24h).toBeCloseTo(2.2449, 3);
    // (190 - 190) / 190 * 100 = 0
    expect(aapl.priceChange24h).toBe(0);
  });

  it("handles prevDayPx of 0 without division error", () => {
    const zeroPrev: MetaAndAssetCtxsResponse = {
      meta: { universe: [{ name: "X", szDecimals: 0, maxLeverage: 1 }] },
      assetCtxs: [{
        dayNtlVlm: "0", funding: "0", impactPxs: [], markPx: "10",
        midPx: "10", openInterest: "0", oraclePx: "10", premium: "0", prevDayPx: "0",
      }],
    };
    const [m] = parseMetaAndAssetCtxs(zeroPrev, "v");
    expect(m.priceChange24h).toBe(0);
  });

  it("handles empty universe", () => {
    const empty: MetaAndAssetCtxsResponse = {
      meta: { universe: [] },
      assetCtxs: [],
    };
    expect(parseMetaAndAssetCtxs(empty, "v")).toEqual([]);
  });

  it("handles mismatched universe/assetCtxs lengths (takes shorter)", () => {
    const mismatched: MetaAndAssetCtxsResponse = {
      meta: {
        universe: [
          { name: "A", szDecimals: 0, maxLeverage: 1 },
          { name: "B", szDecimals: 0, maxLeverage: 1 },
        ],
      },
      assetCtxs: [{
        dayNtlVlm: "0", funding: "0", impactPxs: [], markPx: "1",
        midPx: "1", openInterest: "0", oraclePx: "1", premium: "0", prevDayPx: "1",
      }],
    };
    expect(parseMetaAndAssetCtxs(mismatched, "v")).toHaveLength(1);
  });
});

describe("parseFundingHistory", () => {
  const entries: FundingHistoryEntry[] = [
    { coin: "TSLA", fundingRate: "0.0001", premium: "0.00005", time: 1700000000000 },
    { coin: "TSLA", fundingRate: "-0.0002", premium: "-0.0001", time: 1700003600000 },
  ];

  it("parses entries and computes funding payment", () => {
    const parsed = parseFundingHistory(entries, "TestVenue", 50000);
    expect(parsed).toHaveLength(2);

    expect(parsed[0].coin).toBe("TSLA");
    expect(parsed[0].venue).toBe("TestVenue");
    expect(parsed[0].fundingRate).toBe(0.0001);
    expect(parsed[0].premium).toBe(0.00005);
    expect(parsed[0].fundingPayment).toBeCloseTo(0.0001 * 50000);
    // timestamp converted from ms to seconds
    expect(parsed[0].timestamp).toBe(1700000000);
  });

  it("returns empty array for empty input", () => {
    expect(parseFundingHistory([], "v", 100)).toEqual([]);
  });
});

// ── file-cache.ts ─────────────────────────────────────────────────────────────

describe("fileNameNormalizer", () => {
  it("lowercases and strips non-alphanumeric chars", () => {
    expect(fileNameNormalizer("Build/Current.JSON")).toBe("build/current.json");
  });

  it("keeps slashes, dots, hyphens, underscores", () => {
    expect(fileNameNormalizer("charts/venue/my-venue_1.json")).toBe("charts/venue/my-venue_1.json");
  });

  it("strips special characters", () => {
    expect(fileNameNormalizer("foo[bar].json")).toBe("foobar.json");
  });

  it("decodes URI components", () => {
    expect(fileNameNormalizer("hello%20world.json")).toBe("helloworld.json");
  });
});

describe("mergeHistoricalData", () => {
  it("returns new records when existing is null", () => {
    const records = [{ timestamp: 1, value: "a" }];
    expect(mergeHistoricalData(null, records)).toEqual(records);
  });

  it("returns new records when existing is empty", () => {
    const records = [{ timestamp: 1, value: "a" }];
    expect(mergeHistoricalData([], records)).toEqual(records);
  });

  it("merges and deduplicates by timestamp", () => {
    const existing = [
      { timestamp: 1, value: "old1" },
      { timestamp: 2, value: "old2" },
    ];
    const newRec = [
      { timestamp: 2, value: "new2" },
      { timestamp: 3, value: "new3" },
    ];
    const merged = mergeHistoricalData(existing, newRec);
    expect(merged).toHaveLength(3);
    expect(merged[0]).toEqual({ timestamp: 1, value: "old1" });
    expect(merged[1]).toEqual({ timestamp: 2, value: "new2" }); // new overwrites old
    expect(merged[2]).toEqual({ timestamp: 3, value: "new3" });
  });

  it("returns sorted by timestamp", () => {
    const existing = [{ timestamp: 3 }];
    const newRec = [{ timestamp: 1 }, { timestamp: 2 }];
    const merged = mergeHistoricalData(existing, newRec);
    expect(merged.map((r) => r.timestamp)).toEqual([1, 2, 3]);
  });
});
