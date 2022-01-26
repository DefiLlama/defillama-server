import BigNumber from "bignumber.js";
import * as dexAdapters from "../../../DefiLlama-Adapters/dexVolumes";

import {
  getDexVolumeRecord,
  putDailyDexVolumeRecord,
  putHourlyDexVolumeRecord,
  putMonthlyDexVolumeRecord,
} from "../../dexVolumes/dexVolumeRecords";

import {
  DAY,
  HOUR,
  getTimestampAtStartOfHour,
  getTimestampAtStartOfMonth,
  getTimestampAtStartOfNextMonth,
} from "../../utils/date";

export { default as calcDailyVolume } from "./calcDailyVolume";
export { default as fetchAllEcosystemsFromStart } from "./fetchAllEcosystemsFromStart";
export { default as fetchEcosystemsFromStart } from "./fetchEcosystemsFromStart";
export { default as getBlocksFromStart } from "./getBlocksFromStart";
export { default as getVolumesFromStart } from "./getVolumesFromStart";

import calcDailyVolume from "./calcDailyVolume";
import calcHourlyVolume from "./calcHourlyVolume";

import fetchAllEcosystemsFromStart from "./fetchAllEcosystemsFromStart";

import {
  AllEcosystemVolumes,
  DailyEcosystemRecord,
  HourlyEcosystemRecord,
  MonthlyEcosystemRecord,
  MonthlyEcosystemVolumes,
  VolumeAdapter,
} from "../../../src/dexVolumes/dexVolume.types";

export const MAX_HOURS = 25;

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
  const monthlySumVolume = new BigNumber(0);
  const totalSumVolume = new BigNumber(0);
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
    const currTotalVolume =
      volumes[startMonthTimestamp]?.totalVolume ||
      volumes[timestamp]?.totalVolume;
    const nextTotalVolume = volumes[nextTimestamp]?.totalVolume;

    if (currTotalVolume !== undefined && nextTotalVolume !== undefined) {
      const bigNumCurrTotalVol = new BigNumber(currTotalVolume);
      const bigNumNextTotalVol = new BigNumber(nextTotalVolume);
      const bigNumMonthlyVolume = bigNumNextTotalVol.minus(bigNumCurrTotalVol);

      monthlySumVolume.plus(bigNumMonthlyVolume);
      totalSumVolume.plus(bigNumCurrTotalVol);

      monthlyEcosystemVolumes[ecosystem] = {
        monthlyVolume: bigNumMonthlyVolume.toString(),
        totalVolume: currTotalVolume,
      };
    }
  });

  return {
    monthlyVolume: monthlySumVolume.toString(),
    totalVolume: totalSumVolume.toString(),
    ecosystems: monthlyEcosystemVolumes,
  };
};

const calcAllVolumes = async ({
  currentTimestamp,
  id,
  volume,
}: {
  currentTimestamp: number;
  id: number;
  volume: VolumeAdapter;
}) => {
  const allEcosystemVolumes = await fetchAllEcosystemsFromStart(
    volume,
    currentTimestamp
  );
  const ecosystemNames = Object.keys(allEcosystemVolumes);

  const earliestTimestamp = ecosystemNames.reduce(
    (acc, curr) =>
      acc > allEcosystemVolumes[curr].startTimestamp
        ? allEcosystemVolumes[curr].startTimestamp
        : acc,
    Number.MAX_SAFE_INTEGER
  );

  const dailyVolumes: { [x: string]: DailyEcosystemRecord } = {};
  const hourlyVolumes: { [x: string]: HourlyEcosystemRecord } = {};
  const monthlyVolumes: { [x: string]: MonthlyEcosystemRecord } = {};

  for (
    // Assumes earliest is start of day returned from getVolumesFromStart
    let timestamp = earliestTimestamp;
    timestamp < currentTimestamp;
    timestamp += DAY
  ) {
    const { dailyVolume, totalVolume, ecosystems } = calcDailyVolume({
      allEcosystemVolumes,
      ecosystemNames,
      timestamp,
      end: currentTimestamp,
    });

    const unix = timestamp - DAY;

    dailyVolumes[unix] = {
      id,
      unix,
      dailyVolume,
      totalVolume,
      ecosystems,
    };
  }

  const recentHours =
    currentTimestamp - earliestTimestamp >= HOUR * 24
      ? 24
      : (currentTimestamp - earliestTimestamp) / HOUR + 1;

  for (let i = 0; i < recentHours; i++) {
    const timestamp = currentTimestamp - HOUR * i;

    const { dailyVolume, hourlyVolume, totalVolume, ecosystems } =
      calcHourlyVolume({ allEcosystemVolumes, ecosystemNames, timestamp });

    const unix = timestamp - HOUR;

    hourlyVolumes[unix] = {
      id,
      unix,
      dailyVolume,
      hourlyVolume,
      totalVolume,
      ecosystems,
    };
  }

  let monthlyVolTimestamp = earliestTimestamp;
  while (monthlyVolTimestamp < currentTimestamp) {
    const { monthlyVolume, totalVolume, ecosystems } = calcMonthlyVolume({
      allEcosystemVolumes,
      ecosystemNames,
      timestamp: monthlyVolTimestamp,
      end: currentTimestamp,
    });

    const unix = getTimestampAtStartOfMonth(monthlyVolTimestamp);

    monthlyVolumes[unix] = {
      id,
      unix,
      monthlyVolume,
      totalVolume,
      ecosystems,
    };
    monthlyVolTimestamp = getTimestampAtStartOfNextMonth(monthlyVolTimestamp);
  }

  return {
    dailyVolumes,
    hourlyVolumes,
    monthlyVolumes,
    earliestTimestamp,
  };
};

const backfillDexVolumes = async (id: number) => {
  const currentTimestamp = getTimestampAtStartOfHour(Date.now() / 1000);

  const {
    module: dexModule,
  }: {
    name: string;
    module: keyof typeof dexAdapters;
  } = await getDexVolumeRecord(id);

  const { volume, breakdown }: any = dexAdapters[dexModule];

  const allDbWrites = [];

  if (volume) {
    const { dailyVolumes, hourlyVolumes, monthlyVolumes } =
      await calcAllVolumes({
        currentTimestamp,
        id,
        volume,
      });

    Object.values(dailyVolumes).forEach(
      (dailyEcosystemRecord: DailyEcosystemRecord) => {
        allDbWrites.push(putDailyDexVolumeRecord(dailyEcosystemRecord));
      }
    );

    Object.values(hourlyVolumes).forEach(
      (hourlyEcosystemRecord: HourlyEcosystemRecord) => {
        allDbWrites.push(putHourlyDexVolumeRecord(hourlyEcosystemRecord));
      }
    );

    Object.values(monthlyVolumes).forEach(
      (monthlyEcosystemRecord: MonthlyEcosystemRecord) => {
        allDbWrites.push(putMonthlyDexVolumeRecord(monthlyEcosystemRecord));
      }
    );
  }

  // TODO unlock dex-volume at end to allow hourly CRON
};

// TODO fill multiple protocols
// TODO fill All protocols
