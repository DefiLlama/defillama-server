import calcAllDailyBreakdownVolume from "./";

import {
  calcAllDailyBreakdownVolumeResult,
  minDailyBreakdownVolume1,
  minDailyBreakdownVolume2,
} from "../fixtures";

describe("calcAllDailyBreakdownVolume", () => {
  describe("calculates total daily volume stats given daily volumes from different features ", () => {
    it("calculate daily volumes correctly ", async () => {
      const id = 468;
      const earliestTimestamp = 1638316800;
      const currentTimestamp = 1638576000;

      const breakdownDailyVolumes1 = {
        dailyVolumes: minDailyBreakdownVolume1,
        earliestTimestamp,
        breakdown: "alpacaV1",
      };

      const breakdownDailyVolumes2 = {
        dailyVolumes: minDailyBreakdownVolume2,
        earliestTimestamp: 1638403200,
        breakdown: "alpacaV2",
      };

      const result = calcAllDailyBreakdownVolume({
        breakdownDailyVolumes: [breakdownDailyVolumes1, breakdownDailyVolumes2],
        currentTimestamp,
        id,
      });

      expect(result).toEqual(calcAllDailyBreakdownVolumeResult);
    });
  });
});
