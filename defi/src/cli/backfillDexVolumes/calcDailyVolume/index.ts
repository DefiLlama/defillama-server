import BigNumber from "bignumber.js";

import { getTimestampAtStartOfNextDayUTC, DAY } from "../../../utils/date";

import {
  AllEcosystemVolumes,
  DailyEcosystemVolumes,
} from "../../../../src/dexVolumes/dexVolume.types";

export const createMissingDayError = (
  ecosystem: string,
  nextDayTimestamp: number
) => {
  throw new Error(`Missing day data on ${nextDayTimestamp} for ${ecosystem}`);
};

const calcDailyVolume = ({
  allEcosystemVolumes,
  ecosystemNames,
  timestamp,
  end,
}: {
  allEcosystemVolumes: AllEcosystemVolumes;
  ecosystemNames: string[];
  timestamp: number;
  end: number;
}) => {
  let dailySumVolume = new BigNumber(0);
  let totalSumVolume = new BigNumber(0);
  const dailyEcosystemVolumes: DailyEcosystemVolumes = {};

  const nextDayTimestamp = getTimestampAtStartOfNextDayUTC(timestamp);

  ecosystemNames.forEach((ecosystem) => {
    const { volumes } = allEcosystemVolumes[ecosystem];
    const currTotalVolume = volumes[timestamp]?.totalVolume;
    if (
      volumes[timestamp] &&
      !volumes[nextDayTimestamp] &&
      // last timestamp may not be on day exactly
      end - timestamp > DAY
    ) {
      createMissingDayError(ecosystem, nextDayTimestamp);
    }
    // Next day volume or up to current timestamp
    const nextTotalVolume =
      volumes[nextDayTimestamp]?.totalVolume || volumes[end]?.totalVolume;

    if (currTotalVolume !== undefined && nextTotalVolume !== undefined) {
      const bigNumCurrTotalVol = new BigNumber(currTotalVolume);
      const bigNumNextTotalVol = new BigNumber(nextTotalVolume);
      const bigNumDailyVolume = bigNumNextTotalVol.minus(bigNumCurrTotalVol);

      dailySumVolume = dailySumVolume.plus(bigNumDailyVolume);
      totalSumVolume = totalSumVolume.plus(bigNumNextTotalVol);

      dailyEcosystemVolumes[ecosystem] = {
        dailyVolume: bigNumDailyVolume.toString(),
        totalVolume: nextTotalVolume,
      };
    }
  });

  return {
    dailyVolume: dailySumVolume.toString(),
    totalVolume: totalSumVolume.toString(),
    ecosystems: dailyEcosystemVolumes,
  };
};

export default calcDailyVolume;
