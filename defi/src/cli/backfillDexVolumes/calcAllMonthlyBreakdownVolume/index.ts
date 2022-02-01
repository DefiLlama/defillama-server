import BigNumber from "bignumber.js";

import {
  getTimestampAtStartOfNextMonth,
  getTimestampAtStartOfMonth,
} from "../../../utils/date";
import {
  MonthlyEcosystemRecord,
  MonthlyEcosystemVolumes,
  BreakdownMonthlyEcosystemRecord,
} from "../../../../src/dexVolumes/dexVolume.types";

const calcAllMonthlyBreakdownVolume = async ({
  breakdownMonthlyVolumes,
  currentTimestamp,
  id,
}: {
  breakdownMonthlyVolumes: {
    monthlyVolumes: BreakdownMonthlyEcosystemRecord;
    earliestTimestamp: number;
    breakdown: string;
  }[];
  currentTimestamp: number;
  id: number;
}) => {
  const earliestBdownTimestamp = getTimestampAtStartOfMonth(
    breakdownMonthlyVolumes.reduce(
      (acc, curr) =>
        acc > curr.earliestTimestamp ? curr.earliestTimestamp : acc,
      Number.MAX_SAFE_INTEGER
    )
  );

  const bdownDict = breakdownMonthlyVolumes.reduce(
    (
      acc: { [x: string]: BreakdownMonthlyEcosystemRecord },
      { monthlyVolumes, breakdown }
    ) => {
      acc[breakdown] = monthlyVolumes;
      return acc;
    },
    {}
  );

  const breakdowns = Object.keys(bdownDict);

  const result: { [x: string]: MonthlyEcosystemRecord } = {};

  let monthlyTimestamp = earliestBdownTimestamp;
  // Get everyday up to end
  while (monthlyTimestamp < currentTimestamp) {
    let monthlySumVolume = new BigNumber(0);
    let totalSumVolume = new BigNumber(0);

    const monthlyBreakdown: { [x: string]: MonthlyEcosystemVolumes } = {};

    breakdowns.forEach((breakdown) => {
      const monthlyEcosystemRecord = bdownDict[breakdown]?.[monthlyTimestamp];

      if (monthlyEcosystemRecord) {
        // Add specific breakdown stats to breakdown ex: uniswapv3 breakdown
        monthlyBreakdown[breakdown] =
          monthlyEcosystemRecord.breakdown[breakdown];

        monthlySumVolume = monthlySumVolume.plus(
          new BigNumber(monthlyEcosystemRecord.monthlyVolume)
        );
        totalSumVolume = totalSumVolume.plus(
          new BigNumber(monthlyEcosystemRecord.totalVolume)
        );

        const monthlyEcosystemVolumes =
          monthlyEcosystemRecord?.breakdown?.[breakdown];

        // Summarize total breakdown stats by chain ex: uniswapv2 eth + uniswapv3 eth
        Object.keys(monthlyEcosystemVolumes || {}).forEach((ecosystem) => {
          const ecosystemVolumes = monthlyBreakdown.total?.[ecosystem];

          const currEcosystemBreakdown = monthlyEcosystemVolumes[ecosystem];

          if (!monthlyBreakdown.total) {
            monthlyBreakdown.total = {};
          }

          if (!ecosystemVolumes) {
            monthlyBreakdown.total[ecosystem] = {
              monthlyVolume: currEcosystemBreakdown.monthlyVolume,
              totalVolume: currEcosystemBreakdown.totalVolume,
            };
          } else {
            monthlyBreakdown.total[ecosystem].monthlyVolume = new BigNumber(
              monthlyBreakdown.total[ecosystem].monthlyVolume
            )
              .plus(new BigNumber(currEcosystemBreakdown.monthlyVolume))
              .toString();
            monthlyBreakdown.total[ecosystem].totalVolume = new BigNumber(
              monthlyBreakdown.total[ecosystem].totalVolume
            )
              .plus(new BigNumber(currEcosystemBreakdown.totalVolume))
              .toString();
          }
        });
      }
    });

    // Assumes that there is data for every day up to current
    result[monthlyTimestamp] = {
      id,
      unix: monthlyTimestamp,
      monthlyVolume: monthlySumVolume.toString(),
      totalVolume: totalSumVolume.toString(),
      breakdown: monthlyBreakdown,
    };

    monthlyTimestamp = getTimestampAtStartOfNextMonth(monthlyTimestamp);
  }

  return result;
};

export default calcAllMonthlyBreakdownVolume;
