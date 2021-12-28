import dynamodb from "../utils/shared/dynamodb";
import { Protocol } from "../protocols/data";
import {
  getTimestampAtStartOfDay,
  getDay,
  secondsInDay,
  secondsInWeek,
  secondsBetweenCallsExtra,
} from "../utils/date";
import { getLastRecord, hourlyTvl, dailyTvl } from "../utils/getLastRecord";
import { reportError } from "../utils/error";
import getRecordClosestToTimestamp from "../utils/shared/getRecordClosestToTimestamp";
import { tvlsObject } from "../types";
import { humanizeNumber } from "@defillama/sdk/build/computeTVL/humanizeNumber";
import { sendMessage } from "../utils/discord";

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

  const lastHourlyTVL = (await lastHourlyTVLRecord).tvl;
  if (storePreviousData && lastHourlyTVL * 2 < tvl.tvl && lastHourlyTVL !== 0) { 
    const change = `${humanizeNumber(lastHourlyTVL)} to ${humanizeNumber(
      tvl.tvl
    )}`;
    let tvlToCompareAgainst = await lastWeeklyTVLRecord;
    if(tvlToCompareAgainst.SK === undefined ){
      tvlToCompareAgainst = await lastDailyTVLRecord;
      if(tvlToCompareAgainst.SK === undefined ){
        tvlToCompareAgainst = {
          tvl: 10e9 // 10bil
        }
      }
    }
    if (
      lastHourlyTVL * 5 < tvl.tvl &&
      tvlToCompareAgainst.tvl * 5 < tvl.tvl
    ) {
      const errorMessage = `TVL for ${protocol.name} has 5x (${change}) within one hour, disabling it`
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
          tvlPrev1Hour: lastHourlyTVL,
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
