import { successResponse, wrap, IResponse } from "../utils/shared";
import protocols from "../protocols/data";
import { hourlyTvl } from "../utils/getLastRecord";
import dynamodb from "../utils/shared/dynamodb";
import { getCurrentUnixTimestamp } from "../utils/date";

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  const timestamp = Number(event.pathParameters!.timestamp); // unix timestamp
  const threshold = 1 - Number(event.queryStringParameters?.threshold ?? 0.5); // [0, 1] 

  const response = (await Promise.all(
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
        return null;
      }
      let totalSkippedHourlyUpdates = 0, hourlyDrasticChanges = 0;
      let lastTvl = result.Items[0].tvl;
      let lastTimestamp = result.Items[0].SK;
      /*
      result.Items.push({
        SK: getCurrentUnixTimestamp(),
        tvl: result.Items[result.Items.length-1].tvl
      })
      */
      result.Items?.forEach(item=>{
        if((item.SK - lastTimestamp) > (60+20)*3600){ // max drift is one update getting stored at x:00 and next at x+1:15, so max difference will be <1:20
          totalSkippedHourlyUpdates += Math.round((item.SK - lastTimestamp)/3600) - 1
        }
        if((item.tvl/lastTvl) < threshold || (lastTvl/item.tvl) < threshold){
          hourlyDrasticChanges += 1;
        }
        lastTimestamp = item.SK;
        lastTvl = item.tvl;
      })
      return {
        name: protocol.name,
        totalSkippedHourlyUpdates,
        hourlyDrasticChanges,
      }
    })
  )).filter(p=>p!==null);
  return successResponse(response, 10 * 60); // 10 mins cache
};

export default wrap(handler);
