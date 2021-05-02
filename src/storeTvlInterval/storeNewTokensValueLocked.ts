import dynamodb from "../utils/dynamodb";
import { Protocol } from "../protocols/data";
import {
  getDay,
  getTimestampAtStartOfDay,
  secondsInDay,
  secondsInWeek,
} from "../utils/date";
import { TokensValueLocked, tvlsObject } from "../types";
import { getLastRecord } from "../utils/getLastRecord";
import getTVLOfRecordClosestToTimestamp from "../utils/getTVLOfRecordClosestToTimestamp";

function extractTvl(item: any | undefined) {
  if (item?.SK === undefined || typeof item?.tvl !== "object") {
    return {};
  } else {
    return item.tvl;
  }
}
type PKconverted = (id: string) => string;

export default async (
  protocol: Protocol,
  unixTimestamp: number,
  tvl: tvlsObject<TokensValueLocked>,
  hourlyTvl: PKconverted,
  dailyTvl: PKconverted
) => {
  const hourlyPK = hourlyTvl(protocol.id);

  const [
    lastHourlyRecord,
    lastDailyTVLRecord,
    lastWeeklyTVLRecord,
  ] = await Promise.all([
    getLastRecord(hourlyPK),
    getTVLOfRecordClosestToTimestamp(hourlyPK, unixTimestamp - secondsInDay),
    getTVLOfRecordClosestToTimestamp(hourlyPK, unixTimestamp - secondsInWeek),
  ]);

  await dynamodb.put({
    PK: hourlyPK,
    SK: unixTimestamp,
    ...tvl,
    tvlPrev1Hour: extractTvl(lastHourlyRecord),
    tvlPrev1Day: extractTvl(lastDailyTVLRecord),
    tvlPrev1Week: extractTvl(lastWeeklyTVLRecord),
  });

  if (getDay((await lastHourlyRecord)?.SK) !== getDay(unixTimestamp)) {
    // First write of the day
    await dynamodb.put({
      PK: dailyTvl(protocol.id),
      SK: getTimestampAtStartOfDay(unixTimestamp),
      ...tvl,
    });
  }
};
