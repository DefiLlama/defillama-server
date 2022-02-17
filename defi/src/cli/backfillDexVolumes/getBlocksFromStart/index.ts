import { HOUR, getTimestampAtStartOfNextDayUTC } from "../../../utils/date";
import { getChainBlocksRetry } from "../../utils";
import { MAX_HOURS } from "../";

import {
  Ecosystem,
  TimestampBlocks,
} from "../../../../src/dexVolumes/dexVolume.types";

const getBlocksFromStart = async (
  start: number,
  ecosystem: Ecosystem,
  end: number,
  limit?: number
) => {
  const blocks = [];
  // TODO optimize by storing all blocks in db for one query

  let dailyTimestamp = start;
  // Get everyday up to end
  while (dailyTimestamp < end) {
    blocks.push(getChainBlocksRetry(dailyTimestamp, ecosystem, limit));

    dailyTimestamp = getTimestampAtStartOfNextDayUTC(dailyTimestamp);
  }

  // Get up to last 25 hours
  const recentHours =
    end - start >= HOUR * MAX_HOURS ? MAX_HOURS : (end - start) / HOUR + 1;

  for (let i = 0; i < recentHours; i++) {
    blocks.push(getChainBlocksRetry(end - HOUR * i, ecosystem));
  }

  // TODO add error report
  const allBlocksRes = await Promise.all(blocks);

  return allBlocksRes.reduce((acc: TimestampBlocks, curr) => {
    acc[curr.inputTimestamp] = curr.block;
    return acc;
  }, {});
};

export default getBlocksFromStart;
