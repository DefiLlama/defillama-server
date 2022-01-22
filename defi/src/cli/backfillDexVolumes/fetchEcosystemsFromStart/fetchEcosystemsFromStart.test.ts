import { getVolumesFromStart, getBlocksFromStart } from "../";

import fetchEcosystemsFromStart from "./";

import {
  getBlocksFromStartResult,
  getVolumesFromStartResult,
} from "../fixtures";

import { ChainBlocks } from "../../../dexVolumes/dexVolume.types";

jest.mock("../", () => {
  const originalModule = jest.requireActual("../");

  return {
    __esModule: true,
    ...originalModule,
    getBlocksFromStart: jest.fn(() => getBlocksFromStartResult),
    getVolumesFromStart: jest.fn(() => getVolumesFromStartResult),
  };
});

const ecosystem = "ethereum";

test("getBlocksFromStart", () => {
  const start = 1;
  const end = 2;
  const ecosystem = "ethereum";
  const mockedBlocksFromStartResult = getBlocksFromStart(start, ecosystem, end);
  expect(mockedBlocksFromStartResult).toEqual(getBlocksFromStartResult);
  expect(getBlocksFromStart).toHaveBeenCalled();
});

const fetch = async (_timestamp: number, _chainBlocks: ChainBlocks) => ({
  block: 1,
  dailyVolume: "0",
  totalVolume: "0",
  timestamp: 1,
});

test("getVolumesFromStart", () => {
  const start = 1;
  const end = 2;
  const ecosystem = "ethereum";
  const mockedVolumesFromStartResult = getVolumesFromStart({
    blocks: { "1": 1 },
    ecosystem,
    fetch: fetch,
    start,
    end,
  });
  expect(mockedVolumesFromStartResult).toEqual(getVolumesFromStartResult);
  expect(getVolumesFromStart).toHaveBeenCalled();
});

describe("fetchEcosystemsFromStart", () => {
  describe("Returns correct ecosystem, volumes, and startTimestamp", () => {
    const end = 1642370400; // 16/1/22 22:00
    it("when start is a number", async () => {
      const start = 1;

      const result = await fetchEcosystemsFromStart({
        ecosystem,
        end,
        fetch,
        start,
      });

      expect(result).toEqual({
        ecosystem,
        volumes: getVolumesFromStartResult.allVolumes,
        startTimestamp: getVolumesFromStartResult.startTimestamp,
      });
    });

    it("when start is a function", async () => {
      const start = jest.fn(async () => 1);

      const result = await fetchEcosystemsFromStart({
        ecosystem,
        end,
        fetch,
        start,
      });

      expect(start).toHaveBeenCalled();
      expect(result).toEqual({
        ecosystem,
        volumes: getVolumesFromStartResult.allVolumes,
        startTimestamp: getVolumesFromStartResult.startTimestamp,
      });
    });
  });
});
