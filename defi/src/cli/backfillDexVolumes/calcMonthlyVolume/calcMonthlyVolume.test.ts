import calcMonthlyVolume from "./";

import { twoMonthAllEcosystemVolumes } from "../fixtures";

describe("calcMonthlyVolume", () => {
  describe("calculates monthly volume given current and next monthly volumes", () => {
    it("calculate monthly volumes correctly for multiple ecosystems", async () => {
      const timestamp = 1640995200; // 1/1/22 0:00
      const end = 1643180400;

      const totalMonthlyVolume = `${end}`;

      const llamaMonthlyVolume = 2185200;

      const ecosystems = {
        ngmi: {
          monthlyVolume: totalMonthlyVolume,
          totalVolume: totalMonthlyVolume,
        },
        llama: {
          monthlyVolume: `${llamaMonthlyVolume}`,
          totalVolume: totalMonthlyVolume,
        },
      };

      const result = calcMonthlyVolume({
        allEcosystemVolumes: twoMonthAllEcosystemVolumes,
        ecosystemNames: ["ngmi", "llama"],
        timestamp,
        end,
      });

      expect(result).toEqual({
        monthlyVolume: `${llamaMonthlyVolume + end}`,
        totalVolume: `${end * 2}`,
        ecosystems,
      });
    });

    it("calculate monthly volumes correctly for multiple ecosystems if one of the ecosystems doesnt have volumes", async () => {
      const timestamp = 1638316800; // 1/12/21 0:00
      const end = 1643180400;
      const nextMonth = 1640995200; // 1/1/22 0:00

      const monthlyVolume = `${nextMonth - 1638316800}`;
      const totalVolume = `${nextMonth}`;

      const ecosystems = {
        llama: {
          monthlyVolume,
          totalVolume,
        },
      };

      const result = calcMonthlyVolume({
        allEcosystemVolumes: twoMonthAllEcosystemVolumes,
        ecosystemNames: ["ngmi", "llama"],
        timestamp,
        end,
      });

      expect(result).toEqual({
        monthlyVolume,
        totalVolume,
        ecosystems,
      });
    });

    it("Throws error when next month timestamp is missing", async () => {
      const timestamp = 1638316800; // 16/1/22 21:00
      const end = 1643180400;

      expect(() => {
        calcMonthlyVolume({
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
      }).toThrow(`Missing monthly data on ${1640995200} for avalanche`);
    });
  });
});
