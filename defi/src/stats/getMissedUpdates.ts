import { successResponse, wrap, IResponse } from "../utils/shared";
import protocols from "../protocols/data";
import { hourlyTvl } from "../utils/getLastRecord";
import dynamodb from "../utils/shared/dynamodb";
import { getCurrentUnixTimestamp, toUNIXTimestamp } from "../utils/date";

function getRangeOutOfUpdateTime(timestamp:number){
  const minTimestampDate = new Date(timestamp*1000)
  const minTimestamp = toUNIXTimestamp(minTimestampDate.getTime())

  let maxTimestamp = getCurrentUnixTimestamp()
  const maxTimestampDate = new Date(maxTimestamp*1000)
  if(maxTimestampDate.getMinutes() < 20){
    maxTimestampDate.setHours(maxTimestampDate.getHours() - 1)
  }
  maxTimestampDate.setMinutes(20)
  maxTimestamp = toUNIXTimestamp(maxTimestampDate.getTime());

  const hourlyUpdatesInRange = Math.round((maxTimestamp-minTimestamp)/3600)
  return {minTimestamp, maxTimestamp, hourlyUpdatesInRange}
}

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  const timestamp = Number(event.pathParameters!.timestamp); // unix timestamp
  const threshold = 1 - Number(event.queryStringParameters?.threshold ?? 0.5); // [0, 1]

  const {minTimestamp, maxTimestamp, hourlyUpdatesInRange} = getRangeOutOfUpdateTime(timestamp)
  let countUpdatesAllProtocols = 0, protocolsWithMissedUpdates = 0, protocolsWithDrasticChanges = 0;
  const allExpectedHourlyUpdates = hourlyUpdatesInRange*protocols.length;

  const updates = (await Promise.all(
    protocols.map(async (protocol) => {
      const result = await dynamodb
        .query({
          ExpressionAttributeValues: {
            ":pk": hourlyTvl(protocol.id),
            ":sk": timestamp
          },
          KeyConditionExpression: "PK = :pk AND SK > :sk",
        })
      if(result.Items === undefined || result.Items.length === 0){
        protocolsWithMissedUpdates++;
        return null;
      }
      let maxHourlyChange = 0;
      let totalSkippedHourlyUpdates = 0, hourlyDrasticChanges = 0;
      let lastTvl = result.Items[0].tvl;
      let lastTimestamp = result.Items[0].SK;
      result.Items?.forEach(item=>{
        if((item.SK - lastTimestamp) > (60+20)*60){ // max drift is one update getting stored at x:00 and next at x+1:15, so max difference will be <1:20
          totalSkippedHourlyUpdates += Math.round((item.SK - lastTimestamp)/3600) - 1
        }
        if((item.tvl/lastTvl) < threshold || (lastTvl/item.tvl) < threshold){
          hourlyDrasticChanges += 1;
        }
        maxHourlyChange = Math.max(maxHourlyChange, item.tvl/lastTvl, lastTvl/item.tvl)
        lastTimestamp = item.SK;
        lastTvl = item.tvl;
        if(item.SK > minTimestamp && item.SK < maxTimestamp){
          countUpdatesAllProtocols++;
        }
      })
      if(totalSkippedHourlyUpdates>0){
        protocolsWithMissedUpdates++;
      }
      if(hourlyDrasticChanges>0){
        protocolsWithDrasticChanges++;
      }
      return {
        name: protocol.name,
        totalSkippedHourlyUpdates,
        hourlyDrasticChanges,
        maxHourlyChange,
      }
    })
  )).filter(p=>p!==null);
  const totalProtocols = protocols.length;
  return successResponse({
    updates,
    countUpdatesAllProtocols,
    allExpectedHourlyUpdates,
    missedUpdatesPercent: 1 - (countUpdatesAllProtocols/allExpectedHourlyUpdates),
    totalProtocols,
    protocolsWithMissedUpdates,
    protocolsWithDrasticChanges,
    percentProtocolsWithMissedUpdates: protocolsWithMissedUpdates/totalProtocols,
    percentProtocolsWithDrasticChanges: protocolsWithDrasticChanges/totalProtocols,
  }, 10 * 60); // 10 mins cache
};

export default wrap(handler);
