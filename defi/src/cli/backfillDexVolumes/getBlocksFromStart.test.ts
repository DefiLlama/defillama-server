import { getBlocksFromStart } from "./";
import {
  dailyTimestampFrom1641081600To1642291200,
  past25TimestampsFrom1641088800,
  past25TimestampsFrom1641081600,
  past6TimestampsFrom1641013200,
} from "./fixtures";
import { getChainBlocksRetry } from "../utils";

jest.mock("../utils", () => {
  const originalModule = jest.requireActual("../utils");

  return {
    __esModule: true,
    ...originalModule,
    getChainBlocksRetry: jest.fn((timestamp) => ({
      block: timestamp,
      inputTimestamp: timestamp,
      timestamp,
    })),
  };
});

const ecosystem = "ethereum";

test("getChainBlocksRetry", () => {
  const mockTimestamp = 10;
  const getChainBlocksRetryResult = getChainBlocksRetry(
    mockTimestamp,
    ecosystem
  );
  expect(getChainBlocksRetryResult).toEqual({
    block: mockTimestamp,
    inputTimestamp: mockTimestamp,
    timestamp: mockTimestamp,
  });
  expect(getChainBlocksRetry).toHaveBeenCalled();
});

describe("getBlocksFromStart", () => {
  describe("includes all daily blocks from start < end", () => {
    const start = 1640995200; // 1/1/22
    const end = 1642370400; // 16/1/22 22:00
    it("start begins at start of a day", async () => {
      const timestamps = [start, ...dailyTimestampFrom1641081600To1642291200];

      const result = await getBlocksFromStart(start, ecosystem, end);

      timestamps.forEach((timestamp) => {
        expect(result).toHaveProperty(`${timestamp}`);
      });
    });

    it("start begins at random hour of day", async () => {
      const start = 1641002400; // 1/1/22 2:00

      const timestamps = [start, ...dailyTimestampFrom1641081600To1642291200];

      const result = await getBlocksFromStart(start, ecosystem, end);

      timestamps.forEach((timestamp) => {
        expect(result).toHaveProperty(`${timestamp}`);
      });
    });
  });

  describe("includes all daily blocks from start < end", () => {
    const start = 1640995200; // 1/1/22

    it("More than 25 timestamps passsed since start, gets last 25 timestamps", async () => {
      const end = 1641088800; // 2/1/22 2:00. 27 timestamps from start
      const timestamps = past25TimestampsFrom1641088800;
      const result = await getBlocksFromStart(start, ecosystem, end);

      timestamps.forEach((timestamp) => {
        expect(result).toHaveProperty(`${timestamp}`);
      });
    });

    it("Exactly 25 timestamps passsed since start, gets last 25 timestamps", async () => {
      const end = 1641081600; // 2/1/22 25 hours
      const timestamps = past25TimestampsFrom1641081600;
      const result = await getBlocksFromStart(start, ecosystem, end);

      timestamps.forEach((timestamp) => {
        expect(result).toHaveProperty(`${timestamp}`);
      });
    });

    it("Less than 25 timestamps passsed since start, gets last difference in timestamps", async () => {
      const end = 1641013200; // 1/1/22 5:00 6 timestamps
      const timestamps = past6TimestampsFrom1641013200;

      const result = await getBlocksFromStart(start, ecosystem, end);

      timestamps.forEach((timestamp) => {
        expect(result).toHaveProperty(`${timestamp}`);
      });
    });
  });
});
