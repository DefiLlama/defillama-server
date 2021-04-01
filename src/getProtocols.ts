import { successResponse, wrap, IResponse } from "./utils";
import dynamodb from "./utils/dynamodb";
import protocols, {Protocol} from "./protocols/data";

export function getPercentChange(previous:number, current:number){
  const change = current/previous*100 - 100;
  if(change == Infinity){
    return 100;
  }
  return change
}

const handler = async (
  _event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const response = (await Promise.all(protocols.map(async protocol=>{
    const lastHourlyRecord = await dynamodb.query({
      ExpressionAttributeValues: {
        ':pk': `hourlyTvl#${protocol.id}`,
      },
      KeyConditionExpression: 'PK = :pk',
      Limit: 1,
      ScanIndexForward: false
    })
    const item = lastHourlyRecord.Items?.[0];
    if(item===undefined){
      return null;
    }
    const returnedProtocol:Partial<Protocol> = {...protocol};
    delete returnedProtocol.tvlFunction;
    return {
      ...protocol,
      "tvl": item.tvl,
      "change_1h": getPercentChange(item.tvlPrev1Hour,item.tvl),
      "change_1d": getPercentChange(item.tvlPrev1Day,item.tvl),
      "change_7d": getPercentChange(item.tvlPrev1Week,item.tvl),
    }
  }))).filter(protocol=>protocol!==null)
  return successResponse(response, 10 * 60); // 10 mins cache
};

export default wrap(handler);
