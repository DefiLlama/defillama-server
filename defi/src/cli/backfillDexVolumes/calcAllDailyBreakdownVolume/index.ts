import BigNumber from "bignumber.js";

import { getTimestampAtStartOfNextDayUTC } from "../../../utils/date";
import {
  DailyEcosystemVolumes,
  BreakdownDailyEcosystemRecord,
} from "../../../../src/dexVolumes/dexVolume.types";

const calcAllDailyBreakdownVolume = async (
  breakdownDailyVolumes: {
    dailyVolumes: BreakdownDailyEcosystemRecord;
    earliestTimestamp: number;
    breakdown: string;
  }[],
  currentTimestamp: number,
  id: number
) => {
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

  const bdownTotal = new Map();
  const breakdowns = Object.keys(bdownDict);

  let dailyTimestamp = earliestBdownTimestamp;
  // Get everyday up to end
  while (dailyTimestamp < currentTimestamp) {
    let dailySumVolume = new BigNumber(0);
    let totalSumVolume = new BigNumber(0);

    const dailyBreakdown: DailyEcosystemVolumes = {};

    breakdowns.forEach((breakdown) => {
      const dailyEcosystemRecord = bdownDict[breakdown]?.[dailyTimestamp];

      if (dailyEcosystemRecord) {
        dailySumVolume.plus(new BigNumber(dailyEcosystemRecord.dailyVolume));
        totalSumVolume.plus(new BigNumber(dailyEcosystemRecord.totalVolume));

        const dailyEcosystemVolumes =
          dailyEcosystemRecord?.breakdown?.[breakdown];

        Object.keys(dailyEcosystemVolumes || {}).forEach((ecosystem) => {
          const ecosystemVolumes = dailyBreakdown?.[ecosystem];

          const currEcosystemBreakdown = dailyEcosystemVolumes[ecosystem];

          if (!ecosystemVolumes) {
            dailyBreakdown[ecosystem] = {
              dailyVolume: currEcosystemBreakdown.dailyVolume,
              totalVolume: currEcosystemBreakdown.totalVolume,
            };
          } else {
            dailyBreakdown[ecosystem].dailyVolume = new BigNumber(
              dailyBreakdown[ecosystem].dailyVolume
            )
              .plus(new BigNumber(currEcosystemBreakdown.dailyVolume))
              .toString();
            dailyBreakdown[ecosystem].totalVolume = new BigNumber(
              dailyBreakdown[ecosystem].totalVolume
            )
              .plus(new BigNumber(currEcosystemBreakdown.totalVolume))
              .toString();
          }
        });
      }
    });

    bdownTotal.set(dailyTimestamp, {
      id,
      unix: dailyTimestamp,
      dailyVolume: dailySumVolume.toString(),
      totalVolume: totalSumVolume.toString(),
      breakdown: dailyBreakdown,
    });

    dailyTimestamp = getTimestampAtStartOfNextDayUTC(dailyTimestamp);
  }
};

export default calcAllDailyBreakdownVolume;
