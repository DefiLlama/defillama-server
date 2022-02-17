import calcAllHourlyBreakdownVolume from "./";

import {
  calcAllHourlyBreakdownVolumeResult,
  minHourlyVolumes,
  minHourlyVolumes2,
} from "../fixtures";

describe("calcAllHourlyBreakdownVolume", () => {
  describe("calculates total hourly volume stats given hourly volumes from different features ", () => {
    it("calculate hourly volumes correctly ", async () => {
      const id = 468;
      const currentTimestamp = 1643180400;

      const breakdownHourlyVolumes1 = {
        hourlyVolumes: minHourlyVolumes,
        breakdown: "main",
      };

      const breakdownHourlyVolumes2 = {
        hourlyVolumes: minHourlyVolumes2,
        breakdown: "alpacaV2",
      };

      const result = calcAllHourlyBreakdownVolume({
        breakdownHourlyVolumes: [
          breakdownHourlyVolumes1,
          breakdownHourlyVolumes2,
        ],
        currentTimestamp,
        id,
      });

      expect(result).toEqual(calcAllHourlyBreakdownVolumeResult);
    });
  });
});
