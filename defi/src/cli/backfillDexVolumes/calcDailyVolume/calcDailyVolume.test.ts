import calcDailyVolume from "./";

import { DAY } from "../../../utils/date";

import {
  fetchAllEcosystemsFromStartResult,
  getVolumesFromStartResult,
} from "../fixtures";

describe("calcDailyVolume", () => {
  describe("calculates daily volume stats correctly given start", () => {
    const { startTimestamp } = getVolumesFromStartResult;

    it("calculate daily volumes correctly ", async () => {
      const end = 1641088800; // 2/1/22 2:00
      const nextDayVolume = startTimestamp + DAY;
      const nextDayVolumeString = `${nextDayVolume}`;

      const nextVolume = `${2 * nextDayVolume}`;
      const ecosystems = {
        avalanche: {
          dailyVolume: nextDayVolumeString,
          totalVolume: nextDayVolumeString,
        },
        llama: {
          dailyVolume: nextDayVolumeString,
          totalVolume: nextDayVolumeString,
        },
      };

      const result = calcDailyVolume({
        allEcosystemVolumes: fetchAllEcosystemsFromStartResult,
        ecosystemNames: ["avalanche", "llama"],
        timestamp: startTimestamp,
        end,
      });

      expect({
        dailyVolume: nextVolume,
        totalVolume: nextVolume,
        ecosystems,
      }).toEqual(result);
    });

    it("calculate daily volumes correctly for last non full day", async () => {
      const timestamp = startTimestamp + DAY;
      const end = 1641088800; // 2/1/22 2:00
      const endString = `${end}`;
      const nextDayVolume = end - timestamp;
      const nextDayVolumeString = `${nextDayVolume}`;

      const dailyVolume = `${2 * nextDayVolume}`;
      const totalVolume = `${2 * end}`;

      const ecosystems = {
        avalanche: {
          dailyVolume: nextDayVolumeString,
          totalVolume: endString,
        },
        llama: {
          dailyVolume: nextDayVolumeString,
          totalVolume: endString,
        },
      };

      const result = calcDailyVolume({
        allEcosystemVolumes: {
          avalanche: {
            volumes: {
              [timestamp]: { totalVolume: `${timestamp}` },
              [end]: { totalVolume: `${end}` },
            },
            startTimestamp: timestamp,
          },
          llama: {
            volumes: {
              [timestamp]: { totalVolume: `${timestamp}` },
              [end]: { totalVolume: `${end}` },
            },
            startTimestamp: timestamp,
          },
        },
        ecosystemNames: ["avalanche", "llama"],
        timestamp,
        end,
      });

      expect({
        dailyVolume,
        totalVolume,
        ecosystems,
      }).toEqual(result);
    });

    it("calculate daily volumes correctly if one of the ecosystems doesnt have volumes for a day", async () => {
      const timestamp = startTimestamp + DAY;
      const end = 1641088800; // 2/1/22 2:00
      const endString = `${end}`;
      const nextDayVolume = end - timestamp;
      const nextDayVolumeString = `${nextDayVolume}`;

      const dailyVolume = nextDayVolumeString;
      const totalVolume = endString;

      const ecosystems = {
        avalanche: {
          dailyVolume: nextDayVolumeString,
          totalVolume: endString,
        },
      };

      const result = calcDailyVolume({
        allEcosystemVolumes: {
          avalanche: {
            volumes: {
              [timestamp]: { totalVolume: `${timestamp}` },
              [end]: { totalVolume: `${end}` },
            },
            startTimestamp: timestamp,
          },
          llama: {
            volumes: {},
            startTimestamp: timestamp,
          },
        },
        ecosystemNames: ["avalanche", "llama"],
        timestamp,
        end,
      });

      expect({
        dailyVolume,
        totalVolume,
        ecosystems,
      }).toEqual(result);
    });

    it("Throws error when next day timestamp is missing and is not last day", async () => {
      const timestamp = startTimestamp;
      const end = 1641088800; // 2/1/22 2:00

      expect(() => {
        calcDailyVolume({
          allEcosystemVolumes: {
            avalanche: {
              volumes: {
                [timestamp]: { totalVolume: `${timestamp}` },
              },
              startTimestamp: timestamp,
            },
            llama: {
              volumes: {},
              startTimestamp: timestamp,
            },
          },
          ecosystemNames: ["avalanche", "llama"],
          timestamp,
          end,
        });
      }).toThrow(`Missing day data on ${timestamp + DAY} for avalanche`);
    });
  });
});
