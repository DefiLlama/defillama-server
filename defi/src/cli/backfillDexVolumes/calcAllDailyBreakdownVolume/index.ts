import BigNumber from "bignumber.js";

import { getTimestampAtStartOfNextDayUTC } from "../../../utils/date";
import {
  DailyEcosystemRecord,
  DailyEcosystemVolumes,
  BreakdownDailyEcosystemRecord,
} from "../../../../src/dexVolumes/dexVolume.types";

const calcAllDailyBreakdownVolume = async ({
  breakdownDailyVolumes,
  currentTimestamp,
  id,
}: {
  breakdownDailyVolumes: {
    dailyVolumes: BreakdownDailyEcosystemRecord;
    earliestTimestamp: number;
    breakdown: string;
  }[];
  currentTimestamp: number;
  id: number;
}) => {
  const earliestBdownTimestamp = breakdownDailyVolumes.reduce(
    (acc, curr) =>
      acc > curr.earliestTimestamp ? curr.earliestTimestamp : acc,
    Number.MAX_SAFE_INTEGER
  );

  const bdownDict = breakdownDailyVolumes.reduce(
    (
      acc: { [x: string]: BreakdownDailyEcosystemRecord },
      { dailyVolumes, breakdown }
    ) => {
      acc[breakdown] = dailyVolumes;
      return acc;
    },
    {}
  );

  const breakdowns = Object.keys(bdownDict);

  const result: { [x: string]: DailyEcosystemRecord } = {};

  let dailyTimestamp = earliestBdownTimestamp;
  // Get everyday up to end
  while (dailyTimestamp < currentTimestamp) {
    let dailySumVolume = new BigNumber(0);
    let totalSumVolume = new BigNumber(0);

    const dailyBreakdown: { [x: string]: DailyEcosystemVolumes } = {};

    breakdowns.forEach((breakdown) => {
      const dailyEcosystemRecord = bdownDict[breakdown]?.[dailyTimestamp];

      if (dailyEcosystemRecord) {
        // Add specific breakdown stats to breakdown ex: uniswapv3 breakdown
        dailyBreakdown[breakdown] = dailyEcosystemRecord.breakdown[breakdown];

        dailySumVolume = dailySumVolume.plus(
          new BigNumber(dailyEcosystemRecord.dailyVolume)
        );
        totalSumVolume = totalSumVolume.plus(
          new BigNumber(dailyEcosystemRecord.totalVolume)
        );

        const dailyEcosystemVolumes =
          dailyEcosystemRecord?.breakdown?.[breakdown];

        // Summarize total breakdown stats by chain ex: uniswapv2 eth + uniswapv3 eth
        Object.keys(dailyEcosystemVolumes || {}).forEach((ecosystem) => {
          const ecosystemVolumes = dailyBreakdown.total?.[ecosystem];

          const currEcosystemBreakdown = dailyEcosystemVolumes[ecosystem];

          if (!dailyBreakdown.total) {
            dailyBreakdown.total = {};
          }

          if (!ecosystemVolumes) {
            dailyBreakdown.total[ecosystem] = {
              dailyVolume: currEcosystemBreakdown.dailyVolume,
              totalVolume: currEcosystemBreakdown.totalVolume,
            };
          } else {
            dailyBreakdown.total[ecosystem].dailyVolume = new BigNumber(
              dailyBreakdown.total[ecosystem].dailyVolume
            )
              .plus(new BigNumber(currEcosystemBreakdown.dailyVolume))
              .toString();
            dailyBreakdown.total[ecosystem].totalVolume = new BigNumber(
              dailyBreakdown.total[ecosystem].totalVolume
            )
              .plus(new BigNumber(currEcosystemBreakdown.totalVolume))
              .toString();
          }
        });
      }
    });

    // Assumes that there is data for every day up to current
    result[dailyTimestamp] = {
      id,
      unix: dailyTimestamp,
      dailyVolume: dailySumVolume.toString(),
      totalVolume: totalSumVolume.toString(),
      breakdown: dailyBreakdown,
    };

    dailyTimestamp = getTimestampAtStartOfNextDayUTC(dailyTimestamp);
  }

  return result;
};

export default calcAllDailyBreakdownVolume;
