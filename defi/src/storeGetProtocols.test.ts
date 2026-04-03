jest.mock("./protocols/data", () => ({
  __esModule: true,
  default: [
    {
      id: "1",
      name: "Visible Protocol",
      category: "Lending",
      chains: ["Ethereum"],
    },
  ],
}));

jest.mock("./protocols/parentProtocols", () => ({
  __esModule: true,
  default: [],
}));

jest.mock("./getProtocols", () => ({
  craftProtocolsResponse: jest.fn(),
}));

jest.mock("./utils/getProtocolTvl", () => ({
  getProtocolTvl: jest.fn(),
}));

jest.mock("./api2/cache/file-cache", () => ({
  readRouteData: jest.fn(),
}));

import { craftProtocolsResponse } from "./getProtocols";
import { getProtocolTvl } from "./utils/getProtocolTvl";
import { readRouteData } from "./api2/cache/file-cache";
import { getVisibleChainLabels, hasDimensionsChainVisibility, storeGetProtocols } from "./storeGetProtocols";

const mockedCraftProtocolsResponse = craftProtocolsResponse as jest.MockedFunction<typeof craftProtocolsResponse>;
const mockedGetProtocolTvl = getProtocolTvl as jest.MockedFunction<typeof getProtocolTvl>;
const mockedReadRouteData = readRouteData as jest.MockedFunction<typeof readRouteData>;

describe("storeGetProtocols visible chain filtering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("helper normalizes old names and includes dimensions-backed chains while excluding registry-only chains", () => {
    const protocolChainTvls = {
      Ethereum: 100,
      Optimism: 50,
    };
    const dimensionsChainAggData = {
      hyperliquid: {
        fees: {
          df: { "24h": 1 },
        },
      },
      hyperevm: {},
    };

    expect(hasDimensionsChainVisibility(dimensionsChainAggData.hyperliquid)).toBe(true);
    expect(hasDimensionsChainVisibility(dimensionsChainAggData.hyperevm)).toBe(false);
    expect(getVisibleChainLabels(protocolChainTvls, dimensionsChainAggData)).toEqual([
      "Ethereum",
      "OP Mainnet",
      "Hyperliquid L1",
    ]);
  });

  test("storeGetProtocols keeps protocol chains unchanged and filters top-level chains by visibility", async () => {
    mockedCraftProtocolsResponse.mockResolvedValue([
      {
        id: "1",
        name: "Visible Protocol",
        category: "Lending",
        chains: ["Ethereum"],
        chainTvls: { Ethereum: 100 },
        oraclesByChain: {},
        symbol: "VP",
        logo: "",
        url: "",
        referralUrl: "",
        parentProtocol: undefined,
        governanceID: undefined,
        gecko_id: undefined,
        tvl: 100,
      } as any,
    ]);
    mockedGetProtocolTvl.mockResolvedValue({
      tvl: 100,
      tvlPrevDay: 90,
      tvlPrevWeek: 80,
      tvlPrevMonth: 70,
      chainTvls: {
        Ethereum: {
          tvl: 100,
          tvlPrevDay: 90,
          tvlPrevWeek: 80,
          tvlPrevMonth: 70,
        },
      },
    } as any);
    mockedReadRouteData.mockResolvedValue({
      hyperliquid: {
        fees: {
          df: { "24h": 1 },
        },
      },
    });

    const { protocols2Data } = await storeGetProtocols({
      getCoinMarkets: async () => ({}),
    });

    expect(protocols2Data.protocols).toHaveLength(1);
    expect(protocols2Data.protocols[0].chains).toEqual(["Ethereum"]);
    expect(protocols2Data.chains).toEqual(["Ethereum", "Hyperliquid L1"]);
    expect(protocols2Data.chains).not.toContain("HyperEVM");
  });

  test("storeGetProtocols falls back to cached visible chains when dimensions cache is missing or empty", async () => {
    mockedCraftProtocolsResponse.mockResolvedValue([
      {
        id: "1",
        name: "Visible Protocol",
        category: "Lending",
        chains: ["Optimism"],
        chainTvls: { Optimism: 100 },
        oraclesByChain: {},
        symbol: "VP",
        logo: "",
        url: "",
        referralUrl: "",
        parentProtocol: undefined,
        governanceID: undefined,
        gecko_id: undefined,
        tvl: 100,
      } as any,
    ]);
    mockedGetProtocolTvl.mockResolvedValue({
      tvl: 100,
      tvlPrevDay: 90,
      tvlPrevWeek: 80,
      tvlPrevMonth: 70,
      chainTvls: {
        Optimism: {
          tvl: 100,
          tvlPrevDay: 90,
          tvlPrevWeek: 80,
          tvlPrevMonth: 70,
        },
      },
    } as any);
    mockedReadRouteData.mockImplementation(async (route: string) => {
      if (route === "/dimensions/chain-agg-data") return {};
      if (route === "/lite/protocols2") return { chains: ["Hyperliquid L1"] } as any;
      return null;
    });

    const { protocols2Data } = await storeGetProtocols({
      getCoinMarkets: async () => ({}),
    });

    expect(protocols2Data.chains).toEqual(["OP Mainnet", "Hyperliquid L1"]);
    expect(protocols2Data.chains).not.toContain("HyperEVM");
  });
});
