import { successResponse, wrap, IResponse } from "./utils/shared";
import { CoinsResponse, getBasicCoins } from "./utils/getCoinsUtils";
import getRecordEarliestTimestamp from "./utils/shared/getRecordEarliestTimestamp";

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const requestedCoins = (event.pathParameters?.coins ?? "").split(",");
  const { PKTransforms, coins } = await getBasicCoins(requestedCoins);
  const response = {} as CoinsResponse;
  await Promise.all(
    coins.map(async (coin) => {
      const finalCoin = await getRecordEarliestTimestamp(
        coin.redirect ?? coin.PK
      );
      if (finalCoin === undefined) {
        return;
      }
      response[PKTransforms[coin.PK]] = {
        symbol: coin.symbol,
        price: finalCoin.price,
        timestamp: finalCoin.SK
      };
    })
  );
  return successResponse(
    {
      coins: response
    },
    3600
  ); // 1 hour cache
};

export default wrap(handler);
