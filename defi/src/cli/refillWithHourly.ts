const protocolName = "anchor"
const deleteHourlyAtDaily = false // enable this if you refilled daily, thus overwriting hourly

import dynamodb from "../utils/shared/dynamodb";
import { dailyTokensTvl, dailyTvl, dailyUsdTokensTvl } from "../utils/getLastRecord";
import { getProtocol } from "./utils";
import { getClosestDayStartTimestamp } from "../utils/date";
import getTVLOfRecordClosestToTimestamp from "../utils/shared/getRecordClosestToTimestamp";

const secondsInDay = 24 * 3600;

const isDryRun = process.env.DRY_RUN === "true"
async function main() {
  const protocol = getProtocol(protocolName)
  const now = Math.round(Date.now() / 1000);
  let timestamp = getClosestDayStartTimestamp(now);
  while (true) {
    for (const tvlFunc of [dailyTokensTvl, dailyTvl, dailyUsdTokensTvl]) {
      const dailyPK = tvlFunc(protocol.id)
      const hourlyPK = dailyPK.replace('daily', 'hourly')
      if(deleteHourlyAtDaily){
        const Key = {
          PK: hourlyPK,
          SK: timestamp,
        }
        if(isDryRun){
          console.log(`Delete`, Key)
        } else {
          await dynamodb.delete({
            Key,
          });
        }
      }
      const hourlyData = await getTVLOfRecordClosestToTimestamp(hourlyPK, timestamp, 3*3600)
      if(hourlyData.SK === undefined){
        throw new Error(`No hourly data for ${hourlyPK} @ ${timestamp}`)
      }
      const item = {
        ...hourlyData,
        PK:dailyPK,
        SK:timestamp
      }
      if(isDryRun){
        console.log("write", item)
      } else {
        await dynamodb.put(item)
      }
    }
    console.log(timestamp, new Date(timestamp * 1000).toDateString());
    timestamp = getClosestDayStartTimestamp(timestamp - secondsInDay);
  }
}
main();
