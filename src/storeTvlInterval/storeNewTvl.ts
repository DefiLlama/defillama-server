import dynamodb from "../utils/dynamodb";
import { Protocol } from "../protocols/data";
import {
  getTimestampAtStartOfDay,
  getDay,
  secondsInDay,
  secondsInWeek,
} from "../utils/date";
import { getLastRecord, hourlyTvl, dailyTvl } from "../utils/getLastRecord";
import { reportError } from "../utils/error";
import getTVLOfRecordClosestToTimestamp from "../utils/getTVLOfRecordClosestToTimestamp";
import { tvlsObject } from "../types";
import { humanizeNumber } from "@defillama/sdk/build/computeTVL/humanizeNumber";

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
    unixTimestamp - secondsInDay
  );
  const lastWeeklyTVLRecord = getTVLOfRecordClosestToTimestamp(
    hourlyPK,
    unixTimestamp - secondsInWeek
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
      throw new Error(
        `TVL for ${protocol.name} has 5x (${change}) within one hour, disabling it`
      );
    } else {
      reportError(
        `TVL for ${protocol.name} has >2x (${change})`,
        protocol.name
      );
    }
  }

  await dynamodb.put({
    PK: hourlyPK,
    SK: unixTimestamp,
    ...tvl,
    ...(storePreviousData
      ? {
          tvlPrev1Hour: lastHourlyTVL,
          tvlPrev1Day: (await lastDailyTVLRecord).tvl,
          tvlPrev1Week: (await lastWeeklyTVLRecord).tvl,
        }
      : {}),
  });
  if (getDay((await lastDailyTVLRecord)?.SK) !== getDay(unixTimestamp)) {
    // First write of the day
    await dynamodb.put({
      PK: dailyTvl(protocol.id),
      SK: getTimestampAtStartOfDay(unixTimestamp),
      ...tvl,
    });
  }
}
