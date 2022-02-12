import {
  DAY,
  HOUR,
  getTimestampAtStartOfMonth,
  getTimestampAtStartOfNextMonth,
} from "../../../utils/date";

import { fetchAllEcosystemsFromStart } from "../";

import { calcDailyVolume, calcHourlyVolume, calcMonthlyVolume } from "../";

import {
  DailyEcosystemRecord,
  HourlyEcosystemRecord,
  MonthlyEcosystemRecord,
  VolumeAdapter,
} from "../../../../src/dexVolumes/dexVolume.types";

// Won't work if one of the ecosystem volumes stops reporting totalVolume up to current date. Ex: protocol must keep reporting its totalVolume til current date even if its not active.
const calcAllVolumes = async ({
  currentTimestamp,
  id,
  volumeAdapter,
  breakdown = "total",
}: {
  currentTimestamp: number;
  id: number;
  volumeAdapter: VolumeAdapter;
  breakdown?: string;
}) => {
  const allEcosystemVolumes = await fetchAllEcosystemsFromStart(
    volumeAdapter,
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

    dailyVolumes[timestamp] = {
      id,
      unix: timestamp,
      dailyVolume,
      totalVolume,
      breakdown: {
        [breakdown]: ecosystems,
      },
    };
  }

  const recentHours =
    currentTimestamp - earliestTimestamp >= HOUR * 24
      ? 24
      : (currentTimestamp - earliestTimestamp) / HOUR;

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
      breakdown: {
        [breakdown]: ecosystems,
      },
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
      breakdown: {
        [breakdown]: ecosystems,
      },
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

export default calcAllVolumes;
