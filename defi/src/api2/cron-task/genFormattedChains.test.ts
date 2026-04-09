jest.mock("../cache/file-cache", () => ({
  readRouteData: jest.fn(),
  storeRouteData: jest.fn(),
}));

jest.mock("node-fetch", () => ({
  __esModule: true,
  default: jest.fn(() =>
    Promise.resolve({
      json: async () => ({}),
    })
  ),
}));

import { readRouteData, storeRouteData } from "../cache/file-cache";
import { genFormattedChains } from "./genFormattedChains";

const mockedReadRouteData = readRouteData as jest.MockedFunction<typeof readRouteData>;
const mockedStoreRouteData = storeRouteData as jest.MockedFunction<typeof storeRouteData>;

describe("genFormattedChains", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedReadRouteData.mockImplementation(async (route: string) => {
      if (route === "/lite/protocols2") {
        return {
          chains: ["Ethereum", "Hyperliquid L1"],
          protocols: [
            {
              chains: ["Ethereum"],
              chainTvls: {
                Ethereum: {
                  tvl: 100,
                  tvlPrevDay: 90,
                  tvlPrevWeek: 80,
                  tvlPrevMonth: 70,
                },
              },
            },
          ],
        } as any;
      }

      if (route === "/lite/charts/Ethereum") {
        return { tvl: [[1, 100], [2, 110]] };
      }

      if (route === "/lite/charts/Hyperliquid L1") {
        return null;
      }

      return null;
    });
  });

  test("inherits filtered chains from /lite/protocols2 and keeps dimensions-only chains in chains2 output", async () => {
    await genFormattedChains();

    const allCall = mockedStoreRouteData.mock.calls.find(([route]) => route === "/chains2/All");
    const evmCall = mockedStoreRouteData.mock.calls.find(([route]) => route === "/chains2/EVM");

    expect(allCall).toBeDefined();
    expect(evmCall).toBeDefined();

    const allData = allCall?.[1] as any;
    const evmData = evmCall?.[1] as any;

    expect(allData.chainsUnique).toEqual(["Ethereum", "Hyperliquid L1"]);
    expect(allData.chainsUnique).not.toContain("HyperEVM");
    expect(allData.chainTvls.map((chain: any) => chain.name)).toContain("Hyperliquid L1");

    expect(evmData.chainsUnique).toContain("Hyperliquid L1");
    expect(evmData.chainsUnique).not.toContain("HyperEVM");
  });
});
