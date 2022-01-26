import BigNumber from "bignumber.js";

import { HOUR, getTimestampAtStartOfDayUTC } from "../../../utils/date";

import {
  AllEcosystemVolumes,
  HourlyEcosystemVolumes,
  HourlyVolumesResult,
} from "../../../../src/dexVolumes/dexVolume.types";

export const createMissingHourError = (
  ecosystem: string,
  timestamp: number
) => {
  throw new Error(`Missing data on ${timestamp} for ${ecosystem}`);
};

const calcHourlyVolume = ({
  allEcosystemVolumes,
  ecosystemNames,
  timestamp,
}: {
  allEcosystemVolumes: AllEcosystemVolumes;
  ecosystemNames: string[];
  timestamp: number;
}): HourlyVolumesResult => {
  const prevTimestamp = timestamp - HOUR;

  let dailySumVolume = new BigNumber(0);
  let hourlySumVolume = new BigNumber(0);
  let totalSumVolume = new BigNumber(0);
  const hourlyEcosystemVolumes: HourlyEcosystemVolumes = {};

  ecosystemNames.forEach((ecosystem) => {
    const { volumes } = allEcosystemVolumes[ecosystem];

    if (volumes[timestamp] && !volumes[prevTimestamp]) {
      createMissingHourError(ecosystem, prevTimestamp);
    }

    const currTotalVolume = volumes[timestamp]?.totalVolume;
    const prevTotalVolume = volumes[prevTimestamp]?.totalVolume;

    // Calc values given totalVolume
    if (currTotalVolume && prevTotalVolume) {
      const bigNumCurrTotalVol = new BigNumber(currTotalVolume);
      const bigNumPrevTotalVol = new BigNumber(prevTotalVolume);
      const bigNumStartDayVol = new BigNumber(
        volumes[getTimestampAtStartOfDayUTC(prevTimestamp)].totalVolume
      );
      const bigNumDailyVolume = bigNumCurrTotalVol.minus(bigNumStartDayVol);
      const bigNumHourlyVolume = bigNumCurrTotalVol.minus(bigNumPrevTotalVol);

      dailySumVolume = dailySumVolume.plus(bigNumDailyVolume);
      hourlySumVolume = hourlySumVolume.plus(bigNumHourlyVolume);
      totalSumVolume = totalSumVolume.plus(bigNumCurrTotalVol);

      hourlyEcosystemVolumes[ecosystem] = {
        dailyVolume: bigNumDailyVolume.toString(),
        hourlyVolume: bigNumHourlyVolume.toString(),
        totalVolume: currTotalVolume,
      };
    }
  });

  return {
    dailyVolume: dailySumVolume.toString(),
    hourlyVolume: hourlySumVolume.toString(),
    totalVolume: totalSumVolume.toString(),
    ecosystems: hourlyEcosystemVolumes,
  };
};

export default calcHourlyVolume;
