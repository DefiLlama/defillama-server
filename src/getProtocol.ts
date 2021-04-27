import { successResponse, wrap, IResponse, errorResponse } from "./utils";
import dynamodb from "./utils/dynamodb";
import protocols from "./protocols/data";
import getLastRecord from "./utils/getLastRecord";
import sluggify from "./utils/sluggify"

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const protocolName = event.pathParameters?.protocol?.toLowerCase();
  const protocolData = protocols.find(
    (prot) => sluggify(prot) === protocolName
  );
  if (protocolData === undefined) {
    return errorResponse({
      message: "Protocol is not on our database",
    });
  }
  const lastHourlyRecord = getLastRecord(protocolData.id);
  const historicalTvl = await dynamodb.query({
    ExpressionAttributeValues: {
      ":pk": `dailyTvl#${protocolData.id}`,
    },
    KeyConditionExpression: "PK = :pk",
  });
  const response = protocolData as any;
  response.tvl = historicalTvl.Items?.map((item) => ({
    date: item.SK,
    totalLiquidityUSD: item.tvl,
  }));
  const lastItem = (await lastHourlyRecord).Items?.[0];
  if (lastItem !== undefined) {
    response.tvl[response.tvl.length - 1] = {
      date: lastItem.SK,
      totalLiquidityUSD: lastItem.tvl,
    };
  }

  return successResponse(response, 10 * 60); // 10 mins cache
};

export default wrap(handler);
