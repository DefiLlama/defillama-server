import {
  DAY,
  HOUR,
  calcIsNewDay,
  getTimestampAtStartOfDayUTC,
  getTimestampAtStartOfNextDayUTC,
} from "../../../utils/date";
import { MAX_HOURS } from "../";

import {
  Ecosystem,
  Fetch,
  FetchResult,
  TimestampBlock,
  TimestampVolumes,
} from "../../../../src/dexVolumes/dexVolume.types";

const getVolumesFromStart = async ({
  blocks,
  ecosystem,
  fetch,
  start,
  end,
}: {
  blocks: TimestampBlock;
  ecosystem: Ecosystem;
  fetch: Fetch;
  start: number;
  end: number;
}) => {
  const volumes = [];

  // Get everyday up to today
  let dailyTimestamp = start;
  while (dailyTimestamp < end) {
    const chainBlocks = { [ecosystem]: blocks[dailyTimestamp] };
    volumes.push(fetch(dailyTimestamp, chainBlocks));

    dailyTimestamp = getTimestampAtStartOfNextDayUTC(dailyTimestamp);
  }

  // Get last 25 hours
  const recentHours =
    end - start >= HOUR * MAX_HOURS ? MAX_HOURS : (end - start) / HOUR + 1;

  for (let i = 0; i < recentHours; i++) {
    const timestamp = end - HOUR * i;
    const chainBlocks = { [ecosystem]: blocks[timestamp] };
    volumes.push(fetch(timestamp, chainBlocks));
  }

  const allVolumeRes = await Promise.all(volumes);

  const allVolumes = allVolumeRes.reduce(
    (acc: TimestampVolumes, curr: FetchResult) => {
      const { timestamp, totalVolume } = curr;
      acc[timestamp] = {
        totalVolume,
      };
      return acc;
    },
    {}
  );

  // Add initial volume as 0 for today or prev day if starts at 12:00 as buffer for starts
  // Volume didn't start at beginning of day so need a buffer to calc next - start for daily
  const isNewDay = calcIsNewDay(start);
  const startHasVolume = Number(allVolumes[start]?.totalVolume) > 0;
  const startTimestamp = isNewDay
    ? getTimestampAtStartOfDayUTC(start - DAY)
    : getTimestampAtStartOfDayUTC(start);
  if (
    startHasVolume ||
    (!isNewDay &&
      Number(allVolumes[getTimestampAtStartOfNextDayUTC(start)]?.totalVolume) >
        0)
  ) {
    allVolumes[startTimestamp] = {
      totalVolume: "0",
    };

    // Add padded hour for same reasoning if less than 25 timestamps
    if (startHasVolume && end - start < HOUR * MAX_HOURS) {
      allVolumes[start - HOUR] = {
        totalVolume: "0",
      };
    }

    return {
      allVolumes,
      startTimestamp,
    };
  }

  return {
    allVolumes,
    startTimestamp: start,
  };
};

export default getVolumesFromStart;
