import {
  successResponse,
  wrap,
  IResponse,
  errorResponse,
} from "./utils/shared";
import ddb from "./utils/shared/dynamodb";
import parseRequestBody from "./utils/shared/parseRequestBody";
import getRecordClosestToTimestamp from "./utils/shared/getRecordClosestToTimestamp";
import { coinToPK, DAY } from "./utils/processCoin";
const limit = 20;

const handler = async (
  event: AWSLambda.APIGatewayEvent,
): Promise<IResponse> => {
  const body = parseRequestBody(event.body);
  const requestedCoin = body.coin;
  const timestampsRequested = body.timestamps as number[];

  if (timestampsRequested.length > limit)
    return errorResponse({
      message: `number of requested coins must be ${limit} or less`,
    });

  const coin = (
    await ddb.get({
      PK: coinToPK(requestedCoin),
      SK: 0,
    })
  ).Item;
  if (coin === undefined) {
    return errorResponse({ message: "Coin doesn't exist" });
  }
  const response = {
    decimals: coin.decimals,
    symbol: coin.symbol,
    prices: [] as {
      timestamp: number;
      price: number;
    }[],
  };
  await Promise.all(
    timestampsRequested.map(async (timestampRequested) => {
      const finalCoin = await getRecordClosestToTimestamp(
        coin.redirect ?? coin.PK,
        timestampRequested,
        DAY / 2,
      );
      if (finalCoin.SK === undefined) {
        return;
      }
      response.prices.push({
        price: finalCoin.price,
        timestamp: finalCoin.SK,
      });
    }),
  );
  return successResponse(response);
};

export default wrap(handler);
