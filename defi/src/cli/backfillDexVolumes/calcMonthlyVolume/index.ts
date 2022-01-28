import BigNumber from "bignumber.js";

import {
  getTimestampAtStartOfMonth,
  getTimestampAtStartOfNextMonth,
} from "../../../utils/date";

import {
  AllEcosystemVolumes,
  MonthlyEcosystemVolumes,
} from "../../../../src/dexVolumes/dexVolume.types";

export const createMissingMonthError = (
  ecosystem: string,
  timestamp: number
) => {
  throw new Error(`Missing monthly data on ${timestamp} for ${ecosystem}`);
};

const calcMonthlyVolume = ({
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
  let monthlySumVolume = new BigNumber(0);
  let totalSumVolume = new BigNumber(0);
  const monthlyEcosystemVolumes: MonthlyEcosystemVolumes = {};

  ecosystemNames.forEach((ecosystem) => {
    const { volumes } = allEcosystemVolumes[ecosystem];

    const startMonthTimestamp = getTimestampAtStartOfMonth(timestamp);
    // For current month up to current hour
    const nextTimestamp =
      getTimestampAtStartOfNextMonth(timestamp) > end
        ? end
        : getTimestampAtStartOfNextMonth(timestamp);

    // For first instance when contract did not launch at first of month
    const currTimestamp =
      getTimestampAtStartOfMonth(
        allEcosystemVolumes[ecosystem].startTimestamp
      ) === startMonthTimestamp
        ? allEcosystemVolumes[ecosystem].startTimestamp
        : startMonthTimestamp;

    const currTotalVolume = volumes[currTimestamp]?.totalVolume;
    const nextTotalVolume = volumes[nextTimestamp]?.totalVolume;

    if (volumes[timestamp] && !volumes[nextTimestamp]) {
      createMissingMonthError(ecosystem, nextTimestamp);
    }

    if (currTotalVolume !== undefined && nextTotalVolume !== undefined) {
      const bigNumCurrTotalVol = new BigNumber(currTotalVolume);
      const bigNumNextTotalVol = new BigNumber(nextTotalVolume);
      const bigNumMonthlyVolume = bigNumNextTotalVol.minus(bigNumCurrTotalVol);

      monthlySumVolume = monthlySumVolume.plus(bigNumMonthlyVolume);
      totalSumVolume = totalSumVolume.plus(bigNumNextTotalVol);

      monthlyEcosystemVolumes[ecosystem] = {
        monthlyVolume: bigNumMonthlyVolume.toString(),
        totalVolume: bigNumNextTotalVol.toString(),
      };
    }
  });

  return {
    monthlyVolume: monthlySumVolume.toString(),
    totalVolume: totalSumVolume.toString(),
    ecosystems: monthlyEcosystemVolumes,
  };
};

export default calcMonthlyVolume;
