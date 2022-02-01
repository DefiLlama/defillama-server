import calcAllMonthlyBreakdownVolume from "./";

import {
  calcAllMonthlyBreakdownVolumeResult,
  minMonthlyBreakdownVolumes1,
  minMonthlyBreakdownVolumes2,
} from "../fixtures";

describe("calcAllMonthlyBreakdownVolume", () => {
  describe("calculates total monthly volume stats given monthly volumes from different features ", () => {
    it("calculate monthly volumes correctly ", async () => {
      const id = 468;
      const earliestTimestamp = 1638403200;
      const currentTimestamp = 1644192000;

      const breakdownMonthlyVolumes1 = {
        monthlyVolumes: minMonthlyBreakdownVolumes1,
        earliestTimestamp,
        breakdown: "alpacaV1",
      };

      const breakdownMonthlyVolumes2 = {
        monthlyVolumes: minMonthlyBreakdownVolumes2,
        earliestTimestamp: 1638403200,
        breakdown: "alpacaV2",
      };

      const result = await calcAllMonthlyBreakdownVolume({
        breakdownMonthlyVolumes: [
          breakdownMonthlyVolumes1,
          breakdownMonthlyVolumes2,
        ],
        currentTimestamp,
        id,
      });

      expect(result).toEqual(calcAllMonthlyBreakdownVolumeResult);
    });
  });
});
