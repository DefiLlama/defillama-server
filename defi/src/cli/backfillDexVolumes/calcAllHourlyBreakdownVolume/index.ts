import BigNumber from "bignumber.js";

import { HOUR } from "../../../utils/date";
import {
  HourlyEcosystemRecord,
  HourlyEcosystemVolumes,
  BreakdownHourlyEcosystemRecord,
} from "../../../../src/dexVolumes/dexVolume.types";

const calcAllHourlyBreakdownVolume = ({
  breakdownHourlyVolumes,
  currentTimestamp,
  id,
}: {
  breakdownHourlyVolumes: {
    hourlyVolumes: BreakdownHourlyEcosystemRecord;
    breakdown: string;
  }[];
  currentTimestamp: number;
  id: number;
}) => {
  const bdownDict = breakdownHourlyVolumes.reduce(
    (
      acc: { [x: string]: BreakdownHourlyEcosystemRecord },
      { hourlyVolumes, breakdown }
    ) => {
      acc[breakdown] = hourlyVolumes;
      return acc;
    },
    {}
  );

  const breakdowns = Object.keys(bdownDict);

  const result: { [x: string]: HourlyEcosystemRecord } = {};

  // Get last 24 hour records
  for (let i = 1; i <= 24; i += 1) {
    const hourlyTimestamp = currentTimestamp - HOUR * i;
    let hourlySumVolume = new BigNumber(0);
    let dailySumVolume = new BigNumber(0);
    let totalSumVolume = new BigNumber(0);

    const hourlyBreakdown: { [x: string]: HourlyEcosystemVolumes } = {};
    let hasHourData = false;

    breakdowns.forEach((breakdown) => {
      const hourlyEcosystemRecord = bdownDict[breakdown]?.[hourlyTimestamp];

      if (hourlyEcosystemRecord) {
        hasHourData = true;

        // Add specific breakdown stats to breakdown ex: uniswapv3 breakdown
        hourlyBreakdown[breakdown] = hourlyEcosystemRecord.breakdown[breakdown];

        dailySumVolume = dailySumVolume.plus(
          new BigNumber(hourlyEcosystemRecord.dailyVolume)
        );
        hourlySumVolume = hourlySumVolume.plus(
          new BigNumber(hourlyEcosystemRecord.hourlyVolume)
        );
        totalSumVolume = totalSumVolume.plus(
          new BigNumber(hourlyEcosystemRecord.totalVolume)
        );

        const hourlyEcosystemVolumes =
          hourlyEcosystemRecord?.breakdown?.[breakdown];

        // Summarize total breakdown stats by chain ex: uniswapv2 eth + uniswapv3 eth
        Object.keys(hourlyEcosystemVolumes || {}).forEach((ecosystem) => {
          const ecosystemVolumes = hourlyBreakdown.total?.[ecosystem];

          const currEcosystemBreakdown = hourlyEcosystemVolumes[ecosystem];

          if (!hourlyBreakdown.total) {
            hourlyBreakdown.total = {};
          }

          if (!ecosystemVolumes) {
            hourlyBreakdown.total[ecosystem] = {
              dailyVolume: currEcosystemBreakdown.dailyVolume,
              hourlyVolume: currEcosystemBreakdown.hourlyVolume,
              totalVolume: currEcosystemBreakdown.totalVolume,
            };
          } else {
            hourlyBreakdown.total[ecosystem].dailyVolume = new BigNumber(
              hourlyBreakdown.total[ecosystem].dailyVolume
            )
              .plus(new BigNumber(currEcosystemBreakdown.dailyVolume))
              .toString();

            hourlyBreakdown.total[ecosystem].hourlyVolume = new BigNumber(
              hourlyBreakdown.total[ecosystem].hourlyVolume
            )
              .plus(new BigNumber(currEcosystemBreakdown.hourlyVolume))
              .toString();
            hourlyBreakdown.total[ecosystem].totalVolume = new BigNumber(
              hourlyBreakdown.total[ecosystem].totalVolume
            )
              .plus(new BigNumber(currEcosystemBreakdown.totalVolume))
              .toString();
          }
        });
      }
    });

    if (hasHourData) {
      result[hourlyTimestamp] = {
        id,
        unix: hourlyTimestamp,
        dailyVolume: dailySumVolume.toString(),
        hourlyVolume: hourlySumVolume.toString(),
        totalVolume: totalSumVolume.toString(),
        breakdown: hourlyBreakdown,
      };
    }
  }

  return result;
};

export default calcAllHourlyBreakdownVolume;
