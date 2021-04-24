import dynamodb from "../utils/dynamodb";
import { Protocol } from "../protocols/data";
import { getDay, getTimestampAtStartOfDay, secondsInDay, secondsInWeek } from "../utils/date";
import { TokensValueLocked } from "../types";
import getLastRecord from "../utils/getLastRecord";
import getTVLOfRecordClosestToTimestamp from "../utils/getTVLOfRecordClosestToTimestamp";

export default async (protocol: Protocol,
  unixTimestamp: number,
  tokensVL: TokensValueLocked) => {
  const hourlyPK = `hourlyTokensTvl#${protocol.id}`;

  const [lastHourlyRecord, lastDailyTVLRecord, lastWeeklyTVLRecord] = await Promise.all(
    [
      getLastRecord(protocol.id).then(
        (result) =>
          result.Items?.[0] ?? {
            SK: undefined,
            tokensVL: 0,
          }
      ),
      getTVLOfRecordClosestToTimestamp(
        hourlyPK,
        unixTimestamp - secondsInDay
      ),
      getTVLOfRecordClosestToTimestamp(
        hourlyPK,
        unixTimestamp - secondsInWeek
      )
    ]
  )

  await dynamodb.put({
    PK: hourlyPK,
    SK: unixTimestamp,
    tokensVL,
    tokensVLPrev1Hour: lastHourlyRecord.tokensVL || {},
    tokensVLPrev1Day: lastDailyTVLRecord.tokensVL || {},
    tokensVLPrev1Week: lastWeeklyTVLRecord.tokensVL || {},
  });

  if (getDay((await lastHourlyRecord)?.SK) !== getDay(unixTimestamp)) {
    // First write of the day
    await dynamodb.put({
      PK: `dailyTokensTvl#${protocol.id}`,
      SK: getTimestampAtStartOfDay(unixTimestamp),
      tokensVL,
    });
  }
}
