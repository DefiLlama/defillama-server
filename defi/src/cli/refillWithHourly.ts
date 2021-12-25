const protocolName = "anchor"

import dynamodb from "../utils/dynamodb";
import { dailyTokensTvl, dailyTvl, dailyUsdTokensTvl } from "../utils/getLastRecord";
import { getProtocol } from "./utils";
import { getClosestDayStartTimestamp } from "../utils/date";
import getTVLOfRecordClosestToTimestamp from "../utils/getTVLOfRecordClosestToTimestamp";

const secondsInDay = 24 * 3600;

async function main() {
  const protocol = getProtocol(protocolName)
  const now = Math.round(Date.now() / 1000);
  let timestamp = getClosestDayStartTimestamp(now);
  while (true) {
    for (const tvlFunc of [dailyTokensTvl, dailyTvl, dailyUsdTokensTvl]) {
      const dailyPK = tvlFunc(protocol.id)
      const hourlyPK = dailyPK.replace('daily', 'hourly')
      await dynamodb.delete({
        Key: {
          PK: hourlyPK,
          SK: timestamp,
        },
      });
      const hourlyData = await getTVLOfRecordClosestToTimestamp(hourlyPK, timestamp, 3*3600)
      if(hourlyData.SK === undefined){
        throw new Error(`No hourly data for ${hourlyPK} @ ${timestamp}`)
      }
      await dynamodb.put({
        ...hourlyData,
        PK:dailyPK,
        SK:timestamp
      })
    }
    console.log(timestamp, new Date(timestamp * 1000).toDateString());
    timestamp = getClosestDayStartTimestamp(timestamp - secondsInDay);
  }
}
main();
