import { getBlocksFromStart } from "./";

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
      const timestamps = [
        1640995200, 1641081600, 1641168000, 1641254400, 1641340800, 1641427200,
        1641513600, 1641600000, 1641686400, 1641772800, 1641859200, 1641945600,
        1642032000, 1642118400, 1642204800, 1642291200,
      ];

      const result = await getBlocksFromStart(start, ecosystem, end);

      timestamps.forEach((timestamp) => {
        expect(result).toHaveProperty(`${timestamp}`);
      });
    });

    it("start begins at random hour of day", async () => {
      const start = 1641002400; // 1/1/22 2:00

      const timestamps = [
        1641002400, 1641081600, 1641168000, 1641254400, 1641340800, 1641427200,
        1641513600, 1641600000, 1641686400, 1641772800, 1641859200, 1641945600,
        1642032000, 1642118400, 1642204800, 1642291200,
      ];

      const result = await getBlocksFromStart(start, ecosystem, end);

      timestamps.forEach((timestamp) => {
        expect(result).toHaveProperty(`${timestamp}`);
      });
    });
  });

  describe("includes all daily blocks from start < end", () => {
    const start = 1640995200; // 1/1/22

    it("More than 25 hours passsed since start, gets last 25 hours", async () => {
      const end = 1641088800; // 2/1/22 2:00 26 hours
      const timestamps = [
        1641088800, 1641085200, 1641081600, 1641078000, 1641074400, 1641070800,
        1641067200, 1641063600, 1641060000, 1641056400, 1641052800, 1641049200,
        1641045600, 1641042000, 1641038400, 1641034800, 1641031200, 1641027600,
        1641024000, 1641020400, 1641016800, 1641013200, 1641009600, 1641006000,
        1641002400,
      ];

      const result = await getBlocksFromStart(start, ecosystem, end);

      timestamps.forEach((timestamp) => {
        expect(result).toHaveProperty(`${timestamp}`);
      });
    });

    it("Exactly 25 hours passsed since start, gets last 25 hours", async () => {
      const end = 1641081600; // 2/1/22 2:00 26 hours
      const timestamps = [
        1641081600, 1641078000, 1641074400, 1641070800, 1641067200, 1641063600,
        1641060000, 1641056400, 1641052800, 1641049200, 1641045600, 1641042000,
        1641038400, 1641034800, 1641031200, 1641027600, 1641024000, 1641020400,
        1641016800, 1641013200, 1641009600, 1641006000, 1641002400, 1640998800,
        1640995200,
      ];

      const result = await getBlocksFromStart(start, ecosystem, end);

      timestamps.forEach((timestamp) => {
        expect(result).toHaveProperty(`${timestamp}`);
      });
    });

    it("Less than 25 hours passsed since start, gets last difference in hours", async () => {
      const end = 1641013200; // 2/1/22 2:00 26 hours
      const timestamps = [
        1641013200, 1641009600, 1641006000, 1641002400, 1640998800, 1640995200,
      ];

      const result = await getBlocksFromStart(start, ecosystem, end);

      timestamps.forEach((timestamp) => {
        expect(result).toHaveProperty(`${timestamp}`);
      });
    });
  });
});
