import fetchAllEcosystemsFromStart from "./";

import { fetchEcosystemsFromStart } from "../";
import { getDexVolumeRecord } from "../../../dexVolumes/dexVolumeRecords";

import {
  fetchEcosystemsFromStartResult,
  fetchAllEcosystemsFromStartResult,
} from "../fixtures";

import { ChainBlocks } from "../../../dexVolumes/dexVolume.types";

afterEach(() => {
  jest.clearAllMocks();
});

const fetch = async (_timestamp: number, _chainBlocks: ChainBlocks) => ({
  block: 1,
  dailyVolume: "0",
  totalVolume: "0",
  timestamp: 1,
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
    fetch,
  });
  expect(mockedFetchEcosystemsFromStart).toEqual(
    fetchEcosystemsFromStartResult
  );
  expect(fetchEcosystemsFromStart).toHaveBeenCalled();
});

const traderjoeId = 1;
const traderjoe = { module: "traderjoe" };
const uniswapId = 1;
const uniswap = { module: "uniswap" };

jest.mock("../../../dexVolumes/dexVolumeRecords", () => {
  const originalModule = jest.requireActual(
    "../../../dexVolumes/dexVolumeRecords"
  );

  return {
    __esModule: true,
    ...originalModule,
    getDexVolumeRecord: jest.fn((id) => (id === 1 ? traderjoe : uniswap)),
  };
});

test("getDexVolumeRecord", async () => {
  const mockedGetDexVolumeRecord = getDexVolumeRecord(traderjoeId);
  expect(mockedGetDexVolumeRecord).toEqual(traderjoe);
  expect(getDexVolumeRecord).toHaveBeenCalled();
});

jest.mock("../../../../DefiLlama-Adapters/dexVolumes", () => {
  const { dexVolumeAdapters } = jest.requireActual("../fixtures");
  return {
    ...dexVolumeAdapters,
  };
});

describe("fetchAllEcosystemsFromStart", () => {
  const end = 1642370400; // 16/1/22 22:00
  describe("Adapter with volume", () => {
    it("return all ecosystems with their respective volumes", async () => {
      const result = await fetchAllEcosystemsFromStart(traderjoeId, end);
      expect(getDexVolumeRecord).toHaveBeenCalled();
      expect(fetchEcosystemsFromStart).toHaveBeenCalledTimes(2);

      expect(result).toEqual(fetchAllEcosystemsFromStartResult);
    });
  });
});
