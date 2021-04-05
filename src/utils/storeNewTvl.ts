import dynamodb from "./dynamodb";
import { Protocol } from "../protocols/data";
import { secondsBetweenCalls, getTimestampAtStartOfDay } from "./date";

const secondsBetweenCallsExtra = secondsBetweenCalls * 1.5; // 1.5 to add some wiggle room
const secondsInDay = 60 * 60 * 24;
const secondsInWeek = secondsInDay * 7;

function getTVLOfRecordClosestToTimestamp(PK: string, timestamp: number) {
  return dynamodb
    .query({
      ExpressionAttributeValues: {
        ":pk": PK,
        ":begin": timestamp - secondsBetweenCallsExtra,
        ":end": timestamp + secondsBetweenCallsExtra,
      },
      KeyConditionExpression: "PK = :pk AND SK BETWEEN :begin AND :end",
    })
    .then((records) => {
      if (records.Items == undefined || records.Items.length == 0) {
        return {
          SK: undefined,
          tvl: 0,
        };
      }
      let closest = records.Items[0];
      for (const item of records.Items.slice(1)) {
        if (Math.abs(item.SK - timestamp) < Math.abs(closest.SK - timestamp)) {
          closest = item;
        }
      }
      return closest;
    });
}

function getDay(timestamp: number | undefined): number {
  if (timestamp == undefined) {
    return -1;
  }
  var dt = new Date(timestamp * 1000);
  return dt.getDay();
}

export default async function (
  protocol: Protocol,
  unixTimestamp: number,
  tvl: number
) {
  const hourlyPK = `hourlyTvl#${protocol.id}`;
  const lastHourlyTVLRecord = getTVLOfRecordClosestToTimestamp(
    hourlyPK,
    unixTimestamp
  );
  const lastDailyTVLRecord = getTVLOfRecordClosestToTimestamp(
    hourlyPK,
    unixTimestamp - secondsInDay
  );
  const lastWeeklyTVLRecord = getTVLOfRecordClosestToTimestamp(
    hourlyPK,
    unixTimestamp - secondsInWeek
  );
  //console.log(protocol.name, tvl, (await lastHourlyTVLRecord).tvl, (await lastDailyTVLRecord).tvl, (await lastWeeklyTVLRecord).tvl)
  await dynamodb.put({
    PK: hourlyPK,
    SK: unixTimestamp,
    tvl,
    tvlPrev1Hour: (await lastHourlyTVLRecord).tvl,
    tvlPrev1Day: (await lastDailyTVLRecord).tvl,
    tvlPrev1Week: (await lastWeeklyTVLRecord).tvl,
  });
  if (getDay((await lastHourlyTVLRecord)?.SK) !== getDay(unixTimestamp)) {
    // First write of the day
    await dynamodb.put({
      PK: `dailyTvl#${protocol.id}`,
      SK: getTimestampAtStartOfDay(unixTimestamp),
      tvl,
    });
  }
}
