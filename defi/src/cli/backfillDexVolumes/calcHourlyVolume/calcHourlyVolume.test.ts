import calcHourlyVolume from "./";

import { HOUR } from "../../../utils/date";

import { fetchAllEcosystemsFromStartResult } from "../fixtures";

describe("calcHourlyVolume", () => {
  describe("calculates hourly volume given current and previous hourly volumes", () => {
    it("calculate hourly volumes correctly for multiple ecosystems", async () => {
      const timestamp = 1642366800; // 16/1/22 21:00
      const hourlyVolume = `${HOUR}`;
      const dailyVolume = `${75600}`;
      const totalVolume = `${timestamp}`;

      const ecosystems = {
        avalanche: {
          dailyVolume,
          hourlyVolume,
          totalVolume,
        },
        llama: {
          dailyVolume,
          hourlyVolume,
          totalVolume,
        },
      };

      const result = calcHourlyVolume({
        allEcosystemVolumes: fetchAllEcosystemsFromStartResult,
        ecosystemNames: ["avalanche", "llama"],
        timestamp,
      });

      expect(result).toEqual({
        dailyVolume: `${75600 * 2}`,
        hourlyVolume: `${HOUR * 2}`,
        totalVolume: `${timestamp * 2}`,
        ecosystems,
      });
    });

    it("calculate hourly volumes correctly for multiple ecosystems if one of the ecosystems doesnt have volumes", async () => {
      const timestamp = 1642366800; // 16/1/22 21:00
      const hourlyVolume = `${HOUR}`;
      const dailyVolume = `${75600}`;
      const totalVolume = `${timestamp}`;

      const ecosystems = {
        avalanche: {
          dailyVolume,
          hourlyVolume,
          totalVolume,
        },
      };

      const result = calcHourlyVolume({
        allEcosystemVolumes: {
          ...fetchAllEcosystemsFromStartResult,
          llama: {
            volumes: {},
            startTimestamp:
              fetchAllEcosystemsFromStartResult.llama.startTimestamp,
          },
        },
        ecosystemNames: ["avalanche", "llama"],
        timestamp,
      });

      expect(result).toEqual({
        dailyVolume,
        hourlyVolume,
        totalVolume,
        ecosystems,
      });
    });

    it("Throws error when previous hour timestamp is missing", async () => {
      const timestamp = 1642366800; // 16/1/22 21:00

      expect(() => {
        calcHourlyVolume({
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
        });
      }).toThrow(`Missing hourly data on ${timestamp - HOUR} for avalanche`);
    });
  });
});
