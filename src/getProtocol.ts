import { successResponse, wrap, IResponse, errorResponse } from "./utils";
import dynamodb from "./utils/dynamodb";
import protocols from "./protocols/data";

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const protocolName = event.pathParameters?.protocol?.toLowerCase();
  const protocolData = protocols.find(prot=>prot.name.toLowerCase()===protocolName);
  if(protocolData === undefined){
    return errorResponse({
      message: "Protocol is not on our database"
    })
  }
  const historicalTvl = await dynamodb.query({
    ExpressionAttributeValues: {
      ':pk': `dailyTvl#${protocolData.id}`,
    },
    KeyConditionExpression: 'PK = :pk',
  })
  const response = protocolData as any;
  response.tvl = historicalTvl.Items?.map(item=>({
    date: item.SK,
    totalLiquidityUSD: item.tvl
  }))
  
  return successResponse(response, 10 * 60); // 10 mins cache
};

export default wrap(handler);
