import dynamodb from "./utils/dynamodb";
import { wrapScheduledLambda } from "./utils/wrap";
import protocols, {Protocol} from "./protocols/data";
import {secondsBetweenCalls, getCurrentUnixTimestamp} from './utils/date'
import * as Sentry from '@sentry/serverless'

const maxRetries = 4;
const secondsBetweenCallsExtra = secondsBetweenCalls * 1.5 // 1.5 to add some wiggle room
const secondsInDay = 60*60*24;
const secondsInWeek = secondsInDay*7;

function getDay(timestamp:number|undefined):number{
  if(timestamp == undefined){
    return -1;
  }
  var dt = new Date(timestamp*1000);
  return dt.getDay()
}

function getTVLOfRecordClosestToTimestamp(PK:string, timestamp:number){
  return dynamodb.query({
    ExpressionAttributeValues: {
      ':pk': PK,
      ':begin': timestamp - secondsBetweenCallsExtra,
      ':end': timestamp + secondsBetweenCallsExtra,
    },
    KeyConditionExpression: 'PK = :pk AND SK BETWEEN :begin AND :end',
  }).then(records => {
    if(records.Items == undefined || records.Items.length == 0){
      return {
        SK: undefined,
        tvl: 0
      }
    }
    let closest = records.Items[0]
    for(const item of records.Items.slice(1)){
      if(Math.abs(item.SK-timestamp) < Math.abs(closest.SK-timestamp)){
        closest = item;
      }
    }
    return closest;
  });
}

async function storeTvl(currentUnixTimestamp:number, protocol:Protocol){
  for(let i=0; i<maxRetries; i++){
    let tvl:number;
    try{
      tvl = await protocol.tvlFunction()
    }catch(e){
      if(i >= maxRetries-1){
        console.error(protocol.name, e);
        Sentry.AWSLambda.captureException(e);
        return;
      } else {
        continue;
      }
    }
    const hourlyPK = `hourlyTvl#${protocol.id}`
    const lastHourlyTVLRecord = getTVLOfRecordClosestToTimestamp(hourlyPK, currentUnixTimestamp);
    const lastDailyTVLRecord = getTVLOfRecordClosestToTimestamp(hourlyPK, currentUnixTimestamp - secondsInDay)
    const lastWeeklyTVLRecord = getTVLOfRecordClosestToTimestamp(hourlyPK, currentUnixTimestamp - secondsInWeek)
    await dynamodb.put({
      PK: hourlyPK,
      SK: currentUnixTimestamp,
      tvl,
      tvlPrev1Hour: (await lastHourlyTVLRecord).tvl,
      tvlPrev1Day: (await lastDailyTVLRecord).tvl,
      tvlPrev1Week: (await lastWeeklyTVLRecord).tvl
    });
    if(getDay((await lastHourlyTVLRecord)?.SK) !== getDay(currentUnixTimestamp)){
      // First write of the day
      await dynamodb.put({
        PK: `dailyTvl#${protocol.id}`,
        SK: currentUnixTimestamp,
        tvl,
      })
    }
    return;
  }
}

const handler = async () => {
  const currentTime = getCurrentUnixTimestamp();
  await Promise.all(protocols.map(protocol=>storeTvl(currentTime, protocol)))
};

export default wrapScheduledLambda(handler);
