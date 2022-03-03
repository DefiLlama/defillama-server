import calcAllVolumes from "./";

import {
  twoMonthAllEcosystemVolumes,
  dailyVolumes,
  hourlyVolumes,
  minHourlyVolumes,
  monthlyVolumes,
} from "../fixtures";

import adapter from "../../../../DefiLlama-Adapters/dexVolumes/traderjoe";

const { volume } = adapter;

import { fetchAllEcosystemsFromStart } from "../";

jest.mock("../", () => {
  const originalModule = jest.requireActual("../");

  return {
    __esModule: true,
    ...originalModule,
    fetchAllEcosystemsFromStart: jest.fn(() => twoMonthAllEcosystemVolumes),
  };
});

beforeEach(() => {
  jest.resetModules();
});

test("fetchAllEcosystemsFromStart", () => {
  const end = 2;
  const mockedAllEcosystemsFromStartResult = fetchAllEcosystemsFromStart(
    volume,
    end
  );
  expect(mockedAllEcosystemsFromStartResult).toEqual(
    twoMonthAllEcosystemVolumes
  );
  expect(fetchAllEcosystemsFromStart).toHaveBeenCalled();
});

describe("calcAllVolumes", () => {
  const id = 468;
  const start = 1638316800; // 1/12/21 0:00
  const volumeAdapter = volume;
  volumeAdapter.avax.start = start;
  const currentTimestamp = 1643180400;
  it("calculate earliest timestamp correctly", async () => {
    const result = await calcAllVolumes({
      volumeAdapter,
      id,
      currentTimestamp,
      breakdown: "main",
    });

    expect(result.earliestTimestamp).toEqual(start);
  });

  describe("calculates daily volumes correctly", () => {
    it("calculates multiple ecosystems correctly", async () => {
      const result = await calcAllVolumes({
        volumeAdapter,
        id,
        currentTimestamp,
        breakdown: "main",
      });

      expect(result.dailyVolumes).toEqual(dailyVolumes);
    });
  });

  describe("calculates monthly volumes correctly", () => {
    it("calculates month correctly with different starts", async () => {
      const result = await calcAllVolumes({
        volumeAdapter,
        id,
        currentTimestamp,
        breakdown: "main",
      });

      expect(result.monthlyVolumes).toEqual(monthlyVolumes);
    });
  });

  describe("calculates hourly volumes correctly", () => {
    it("calculates full 24 hours correctly", async () => {
      const result = await calcAllVolumes({
        volumeAdapter,
        id,
        currentTimestamp,
        breakdown: "main",
      });

      expect(result.hourlyVolumes).toEqual(hourlyVolumes);
    });

    it("calculates protocols with less than 24 hours correctly", async () => {
      const newStart = { ...twoMonthAllEcosystemVolumes };
      newStart.ngmi.startTimestamp = 1643169600;
      newStart.llama.startTimestamp = 1643169600;

      (fetchAllEcosystemsFromStart as jest.Mock).mockImplementation(
        () => newStart
      );

      const result = await calcAllVolumes({
        volumeAdapter,
        id,
        currentTimestamp: 1643176800,
        breakdown: "main",
      });

      expect(result.hourlyVolumes).toEqual(minHourlyVolumes);
    });
  });
});
