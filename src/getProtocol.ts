import { successResponse, wrap, IResponse, errorResponse } from "./utils";
import dynamodb from "./utils/dynamodb";
import protocols from "./protocols/data";
import {
  getLastRecord,
  hourlyTvl,
  dailyTvl,
  dailyUsdTokensTvl,
} from "./utils/getLastRecord";
import sluggify from "./utils/sluggify";

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
  const lastHourlyRecord = getLastRecord(hourlyTvl(protocolData.id));
  const historicalUsdTvl = dynamodb.query({
    ExpressionAttributeValues: {
      ":pk": dailyTvl(protocolData.id),
    },
    KeyConditionExpression: "PK = :pk",
  });
  const historicalUsdTokenTvl = dynamodb.query({
    ExpressionAttributeValues: {
      ":pk": dailyUsdTokensTvl(protocolData.id),
    },
    KeyConditionExpression: "PK = :pk",
  });
  const response = protocolData as any;
  response.tvl = (await historicalUsdTvl).Items?.map((item) => ({
    date: item.SK,
    totalLiquidityUSD: item.tvl,
  }));
  response.tokensInUsd = (await historicalUsdTokenTvl).Items?.map((item) => ({
    date: item.SK,
    tokens: item.tvl,
  }));
  const lastItem = await lastHourlyRecord;
  if (lastItem !== undefined) {
    response.tvl[response.tvl.length - 1] = {
      date: lastItem.SK,
      totalLiquidityUSD: lastItem.tvl,
    };
  }

  return successResponse(response, 10 * 60); // 10 mins cache
};

export default wrap(handler);
