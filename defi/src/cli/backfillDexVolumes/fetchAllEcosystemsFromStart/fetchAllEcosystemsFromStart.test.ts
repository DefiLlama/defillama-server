import fetchAllEcosystemsFromStart from "./";

import { fetchEcosystemsFromStart } from "../";

import {
  adapterFetch,
  fetchEcosystemsFromStartResult,
  fetchAllEcosystemsFromStartResult,
  traderJoeVolumeAdapter,
} from "../fixtures";

afterEach(() => {
  jest.clearAllMocks();
});

jest.mock("../", () => {
  const originalModule = jest.requireActual("../");

  return {
    __esModule: true,
    ...originalModule,
    fetchEcosystemsFromStart: jest.fn(({ ecosystem }) => ({
      ...fetchEcosystemsFromStartResult,
      ecosystem,
    })),
  };
});

test("fetchEcosystemsFromStart", async () => {
  const start = 1;
  const end = 2;
  const ecosystem = "ethereum";
  const mockedFetchEcosystemsFromStart = fetchEcosystemsFromStart({
    start,
    ecosystem,
    end,
    fetch: adapterFetch,
  });
  expect(mockedFetchEcosystemsFromStart).toEqual(
    fetchEcosystemsFromStartResult
  );
  expect(fetchEcosystemsFromStart).toHaveBeenCalled();
});

jest.mock("../../../../DefiLlama-Adapters/volumes", () => {
  const { dexVolumeAdapters } = jest.requireActual("../fixtures");
  return {
    ...dexVolumeAdapters,
  };
});

describe("fetchAllEcosystemsFromStart", () => {
  const end = 1642370400; // 16/1/22 22:00
  describe("Adapter with volume", () => {
    it("return all ecosystems with their respective volumes", async () => {
      const result = await fetchAllEcosystemsFromStart(
        traderJoeVolumeAdapter.volume,
        end
      );
      expect(fetchEcosystemsFromStart).toHaveBeenCalledTimes(2);

      expect(result).toEqual(fetchAllEcosystemsFromStartResult);
    });
  });
});
