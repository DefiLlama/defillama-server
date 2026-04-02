jest.mock("../spreadsheet", () => ({
  getCsvData: jest.fn(),
}));

import { toFiniteNumberOrZero, perpsSlug, computeProtocolFees, groupBy } from "./utils";
import { fileNameNormalizer, mergeHistoricalData } from "./file-cache";
import {
  buildCategoryHistoricalCharts,
  buildPerpsIdMap,
  buildVenueHistoricalCharts,
} from "./aggregate";
import {
  getContractId,
  getContractMetadata,
  hasContractMetadata,
  loadContractMetadataFromAirtable,
  normalizePerpsMetadataInPlace,
  PERPS_ALWAYS_STRING_ARRAY_FIELDS,
  PERPS_STRING_OR_NULL_FIELDS,
  resetContractMetadataStore,
  setContractMetadata,
  type PerpsContractMetadata,
} from "./constants";
import { findMarketById, findMarketsByCategory, findMarketsByContract, findMarketsByVenue, resolvePerpsLookupId } from "./server-helpers";
import { HYPERLIQUID_MAKER_FEE, HYPERLIQUID_TAKER_FEE, HYPERLIQUID_DEPLOYER_SHARE } from "./platforms/hyperliquid";
import {
  parseMetaAndAssetCtxs,
  parseFundingHistory,
  type MetaAndAssetCtxsResponse,
  type FundingHistoryEntry,
} from "./platforms/hyperliquid";
import { getCsvData } from "../spreadsheet";

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
      { venue: "a", contract: "BTC" },
      { venue: "a", contract: "ETH" },
      { venue: "b", contract: "SOL" },
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
  const meta: PerpsContractMetadata = {
    referenceAsset: "Tesla",
    referenceAssetGroup: "US Equities",
    assetClass: ["Single stock synthetic perp"],
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

  beforeEach(() => {
    resetContractMetadataStore();
  });

  it("set/get/has round-trips", () => {
    setContractMetadata("TSLA", meta);
    expect(hasContractMetadata("TSLA")).toBe(true);
    expect(hasContractMetadata("tsla")).toBe(true);
    expect(getContractMetadata("TSLA")).toEqual(meta);
    expect(getContractMetadata("tsla")).toEqual(meta);
  });

  it("returns null for unknown contract", () => {
    expect(getContractMetadata("DOESNOTEXIST")).toBeNull();
    expect(hasContractMetadata("DOESNOTEXIST")).toBe(false);
  });
});

describe("getContractId", () => {
  it("lowercases contract name", () => {
    expect(getContractId("TSLA")).toBe("tsla");
    expect(getContractId("aapl")).toBe("aapl");
  });
});

describe("loadContractMetadataFromAirtable", () => {
  const mockGetCsvData = getCsvData as jest.MockedFunction<typeof getCsvData>;

  beforeEach(() => {
    mockGetCsvData.mockReset();
    resetContractMetadataStore();
  });

  it("normalizes Airtable rows with shared string helpers and keeps accessModel direct", async () => {
    mockGetCsvData.mockResolvedValue([
      {
        "Canonical Market ID": "  xyz:META  ",
        "Reference Asset": "  Meta\n  Platforms  ",
        "Reference Asset Group": "  US   Equities ",
        "Asset Class": [" Single stock synthetic perp ", "Single stock   synthetic perp"],
        "Parent Platform": " Hyperliquid ",
        "Pair": " META / USD ",
        "Margin Asset": " USDC ",
        "Settlement Asset": "USDC",
        "Category": [" Equities ", "Equities", " RWA Perpetuals "],
        "Issuer": "-",
        "Website": " https://example.com \n",
        "Oracle Provider": "  Pyth  ",
        "Description": "  Synthetic   META contract ",
        "Access Model": " Permissionless ",
        "RWA Classification": " Programmable  Finance ",
        "Maker Fee Rate": "0.001",
        "Taker Fee Rate": "0.002",
        "Deployer Fee Share": "0.25",
      },
    ]);

    await expect(loadContractMetadataFromAirtable()).resolves.toBe(1);
    expect(getContractMetadata("xyz:META")).toEqual({
      referenceAsset: "Meta Platforms",
      referenceAssetGroup: "US Equities",
      assetClass: ["Single stock synthetic perp"],
      parentPlatform: "Hyperliquid",
      pair: "META / USD",
      marginAsset: "USDC",
      settlementAsset: "USDC",
      category: ["Equities", "RWA Perpetuals"],
      issuer: null,
      website: ["https://example.com"],
      oracleProvider: "Pyth",
      description: "Synthetic META contract",
      accessModel: "Permissionless",
      rwaClassification: "Programmable Finance",
      makerFeeRate: 0.001,
      takerFeeRate: 0.002,
      deployerFeeShare: 0.25,
    });
  });

  it("skips rows without a canonical contract id", async () => {
    mockGetCsvData.mockResolvedValue([
      { "Reference Asset": "Missing contract" },
      { "Canonical Market ID": "   " },
    ]);

    await expect(loadContractMetadataFromAirtable()).resolves.toBe(0);
    expect(getContractMetadata("missing")).toBeNull();
  });
});

describe("normalizePerpsMetadataInPlace", () => {
  it("coerces legacy current-payload metadata into the normalized perps API shape", () => {
    const payload: any = {
      coin: "xyz:META",
      assetClass: "Single stock synthetic perp",
      category: "RWA Perpetuals",
      website: "https://trade.xyz/",
      referenceAssetGroup: "",
      pair: "",
      marginAsset: "",
      settlementAsset: "",
    };

    expect(normalizePerpsMetadataInPlace(payload)).toEqual({
      contract: "xyz:META",
      assetClass: ["Single stock synthetic perp"],
      category: ["RWA Perpetuals"],
      website: ["https://trade.xyz/"],
      referenceAssetGroup: null,
      pair: null,
      marginAsset: null,
      settlementAsset: null,
    });
  });

  it("exposes perps normalization field sets explicitly", () => {
    expect(PERPS_ALWAYS_STRING_ARRAY_FIELDS).toEqual(new Set(["assetClass", "category", "website"]));
    expect(PERPS_STRING_OR_NULL_FIELDS.has("referenceAsset")).toBe(true);
    expect(PERPS_STRING_OR_NULL_FIELDS.has("accessModel")).toBe(true);
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
    expect(tsla.contract).toBe("TSLA");
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

    expect(parsed[0].contract).toBe("TSLA");
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

// ── aggregate.ts ──────────────────────────────────────────────────────────────

describe("buildPerpsIdMap", () => {
  it("preserves bare contract, id, and venue-prefixed aliases without duplicating the venue prefix", () => {
    expect(
      buildPerpsIdMap([
        { id: "tsla", data: { contract: "TSLA", venue: "hyperliquid" } },
        { id: "xyz:meta", data: { contract: "xyz:META", venue: "xyz" } },
      ])
    ).toEqual({
      "tsla": "tsla",
      "hyperliquid-tsla": "tsla",
      "hyperliquid:tsla": "tsla",
      "xyz:meta": "xyz:meta",
      "xyz-meta": "xyz:meta",
    });
  });
});

describe("buildVenueHistoricalCharts", () => {
  it("builds lean historical constituent rows grouped by venue slug", () => {
    const result = buildVenueHistoricalCharts(
      [
        { id: "xyz:meta", timestamp: 100, open_interest: "10", volume_24h: "3" },
        { id: "xyz:meta", timestamp: 200, open_interest: "12", volume_24h: "4" },
        { id: "flx:gold", timestamp: 200, open_interest: "7", volume_24h: "2" },
      ],
      [
        {
          id: "xyz:meta",
          data: {
            contract: "xyz:META",
            venue: "xyz",
            referenceAsset: "Meta",
            assetClass: ["Single stock synthetic perp"],
            category: ["RWA Perpetuals"],
          },
        },
        {
          id: "flx:gold",
          data: {
            contract: "flx:GOLD",
            venue: "flx",
            referenceAsset: "Gold",
            assetClass: ["Commodity synthetic perp"],
            category: ["Commodities"],
          },
        },
      ]
    );

    expect(result).toEqual({
      xyz: [
        {
          timestamp: 100,
          id: "xyz:meta",
          contract: "xyz:META",
          venue: "xyz",
          referenceAsset: "Meta",
          assetClass: ["Single stock synthetic perp"],
          category: ["RWA Perpetuals"],
          openInterest: 10,
          volume24h: 3,
        },
        {
          timestamp: 200,
          id: "xyz:meta",
          contract: "xyz:META",
          venue: "xyz",
          referenceAsset: "Meta",
          assetClass: ["Single stock synthetic perp"],
          category: ["RWA Perpetuals"],
          openInterest: 12,
          volume24h: 4,
        },
      ],
      flx: [
        {
          timestamp: 200,
          id: "flx:gold",
          contract: "flx:GOLD",
          venue: "flx",
          referenceAsset: "Gold",
          assetClass: ["Commodity synthetic perp"],
          category: ["Commodities"],
          openInterest: 7,
          volume24h: 2,
        },
      ],
    });
  });
});

describe("buildCategoryHistoricalCharts", () => {
  it("duplicates rows per category and narrows each row to the requested category", () => {
    const result = buildCategoryHistoricalCharts(
      [{ id: "xyz:meta", timestamp: 100, open_interest: "10", volume_24h: "3" }],
      [
        {
          id: "xyz:meta",
          data: {
            contract: "xyz:META",
            venue: "xyz",
            referenceAsset: "Meta",
            assetClass: ["Single stock synthetic perp"],
            category: ["RWA Perpetuals", "Equities"],
          },
        },
      ]
    );

    expect(result["rwa-perpetuals"]).toEqual([
      {
        timestamp: 100,
        id: "xyz:meta",
        contract: "xyz:META",
        venue: "xyz",
        referenceAsset: "Meta",
        assetClass: ["Single stock synthetic perp"],
        category: ["RWA Perpetuals"],
        openInterest: 10,
        volume24h: 3,
      },
    ]);
    expect(result["equities"]).toEqual([
      {
        timestamp: 100,
        id: "xyz:meta",
        contract: "xyz:META",
        venue: "xyz",
        referenceAsset: "Meta",
        assetClass: ["Single stock synthetic perp"],
        category: ["Equities"],
        openInterest: 10,
        volume24h: 3,
      },
    ]);
  });
});

describe("server route helpers", () => {
  const currentData = [
    { id: "tsla", contract: "TSLA", venue: "Hyperliquid", category: ["Equities"] },
    { id: "xyz:meta", contract: "xyz:META", venue: "XYZ", category: ["RWA Perpetuals", "Equities"] },
  ];

  it("finds a market by id case-insensitively", () => {
    expect(findMarketById(currentData, "XYZ:META")).toEqual(currentData[1]);
  });

  it("finds markets by canonical contract key", () => {
    expect(findMarketsByContract(currentData, "xyz:META")).toEqual([currentData[1]]);
    expect(findMarketsByContract(currentData, "xyz-meta")).toEqual([currentData[1]]);
  });

  it("filters markets by venue slug", () => {
    expect(findMarketsByVenue(currentData, "hyperliquid")).toEqual([currentData[0]]);
  });

  it("filters markets by category", () => {
    expect(findMarketsByCategory(currentData, "Equities")).toEqual(currentData);
  });

  it("resolves lowercase and slugged aliases through id-map entries", () => {
    const idMap = {
      "xyz:meta": "xyz:meta",
      "xyz-meta": "xyz:meta",
      "hyperliquid:tsla": "tsla",
      "hyperliquid-tsla": "tsla",
    };

    expect(resolvePerpsLookupId(idMap, "xyz:META")).toBe("xyz:meta");
    expect(resolvePerpsLookupId(idMap, "xyz-meta")).toBe("xyz:meta");
    expect(resolvePerpsLookupId(idMap, "hyperliquid:TSLA")).toBe("tsla");
    expect(resolvePerpsLookupId(idMap, "hyperliquid-tsla")).toBe("tsla");
  });
});
