import dynamodb from "../utils/shared/dynamodb";
import { Protocol } from "../protocols/data";
import {
  getTimestampAtStartOfDay,
  getDay,
  secondsInDay,
  secondsInWeek,
  secondsBetweenCallsExtra,
  HOUR,
} from "../utils/date";
import { getLastRecord, hourlyTvl, dailyTvl } from "../utils/getLastRecord";
import { reportError } from "../utils/error";
import getRecordClosestToTimestamp from "../utils/shared/getRecordClosestToTimestamp";
import { tvlsObject } from "../types";
import { util } from "@defillama/sdk";
import { sendMessage } from "../utils/discord";
import { extraSections } from "../utils/normalizeChain";

const { humanizeNumber: { humanizeNumber, } } = util

async function getTVLOfRecordClosestToTimestamp(
  PK: string,
  timestamp: number,
  searchWidth: number){
    const record = await getRecordClosestToTimestamp(PK, timestamp, searchWidth)
    if(record.SK === undefined){
      return {
        SK: undefined,
        tvl: 0
      }
    }
    return record
}

function calculateTVLWithAllExtraSections(tvl: tvlsObject<number>) {
  return extraSections.reduce((sum, option) => sum + (tvl[option] ?? 0), tvl.tvl)
}

export default async function (
  protocol: Protocol,
  unixTimestamp: number,
  tvl: tvlsObject<number>,
  storePreviousData: boolean
) {
  const hourlyPK = hourlyTvl(protocol.id);
  const lastHourlyTVLRecord = getLastRecord(hourlyPK).then(
    (result) =>
      result ?? {
        SK: undefined,
        tvl: 0,
      }
  );
  const lastDailyTVLRecord = getTVLOfRecordClosestToTimestamp(
    hourlyPK,
    unixTimestamp - secondsInDay,
    secondsBetweenCallsExtra
  );
  const lastWeeklyTVLRecord = getTVLOfRecordClosestToTimestamp(
    hourlyPK,
    unixTimestamp - secondsInWeek,
    secondsBetweenCallsExtra
  );
  const dailyPK = dailyTvl(protocol.id);
  const dayDailyTvlRecord = getTVLOfRecordClosestToTimestamp(
    dailyPK,
    unixTimestamp - secondsInDay,
    secondsInDay
  );
  const weekDailyTvlRecord = getTVLOfRecordClosestToTimestamp(
    dailyPK,
    unixTimestamp - secondsInWeek,
    secondsInDay
  );

  const lastHourlyTVLObject = await lastHourlyTVLRecord;

  if (storePreviousData) {
    await Promise.all(Object.entries(tvl).map(async ([sectionName, sectionTvl]) => {
      const prevTvl = lastHourlyTVLObject[sectionName]
      if (sectionTvl === 0 && prevTvl !== 0 && prevTvl !== undefined) {
        await sendMessage(
          `TVL for ${protocol.name} has dropped to 0 on key "${sectionName}" (previous TVL was ${prevTvl})`,
          process.env.DROPS_WEBHOOK!)
      }
    }))
  }

  {
    const lastHourlyTVL = calculateTVLWithAllExtraSections(lastHourlyTVLObject);
    const currentTvl = calculateTVLWithAllExtraSections(tvl)
    if (storePreviousData && lastHourlyTVL * 2 < currentTvl && lastHourlyTVL !== 0) {
      const change = `${humanizeNumber(lastHourlyTVL)} to ${humanizeNumber(
        currentTvl
      )}`;
      let tvlToCompareAgainst = await lastWeeklyTVLRecord;
      if (tvlToCompareAgainst.SK === undefined) {
        tvlToCompareAgainst = await lastDailyTVLRecord;
        if (tvlToCompareAgainst.SK === undefined) {
          tvlToCompareAgainst = {
            tvl: 10e9 // 10bil
          }
        }
      }
      const timeElapsed = Math.abs(lastHourlyTVLObject.SK - unixTimestamp)
      if (
        timeElapsed < (10 * HOUR) &&
        lastHourlyTVL * 5 < currentTvl &&
        calculateTVLWithAllExtraSections(tvlToCompareAgainst) * 5 < currentTvl
      ) {
        const errorMessage = `TVL for ${protocol.name} has 5x (${change}) within one hour. It's been disabled but will be automatically re-enabled in ${(10 - timeElapsed/HOUR).toFixed(2)} hours`
        if(timeElapsed > (3 * HOUR)){
          await sendMessage(errorMessage, process.env.OUTDATED_WEBHOOK!)
        }
        await sendMessage(errorMessage, process.env.SPIKE_WEBHOOK!)
        throw new Error(
          errorMessage
        );
      } else {
        const errorMessage = `TVL for ${protocol.name} has >2x (${change})`
        reportError(
          errorMessage,
          protocol.name
        );
        await sendMessage(errorMessage, process.env.SPIKE_WEBHOOK!)
      }
    }
  }

  let tvlPrev1Day =  (await lastDailyTVLRecord).tvl
  let tvlPrev1Week = (await lastWeeklyTVLRecord).tvl
  const dayDailyTvl = (await dayDailyTvlRecord).tvl
  const weekDailyTvl = (await weekDailyTvlRecord).tvl
  if(tvlPrev1Day !== 0 && dayDailyTvl !== 0 && tvlPrev1Day > (dayDailyTvl*2)){
    tvlPrev1Day = 0;
  }
  if(tvlPrev1Week !== 0 && weekDailyTvl !== 0 && tvlPrev1Week > (weekDailyTvl*2)){
    tvlPrev1Week = 0;
  }

  await dynamodb.put({
    PK: hourlyPK,
    SK: unixTimestamp,
    ...tvl,
    ...(storePreviousData
      ? {
          tvlPrev1Hour: lastHourlyTVLObject.tvl,
          tvlPrev1Day,
          tvlPrev1Week,
        }
      : {}),
  });

  const closestDailyRecord = await getTVLOfRecordClosestToTimestamp(
    dailyPK,
    unixTimestamp,
    secondsInDay*1.5
  );
  if (getDay(closestDailyRecord?.SK) !== getDay(unixTimestamp)) {
    // First write of the day
    await dynamodb.put({
      PK: dailyTvl(protocol.id),
      SK: getTimestampAtStartOfDay(unixTimestamp),
      ...tvl,
    });
  }
}
