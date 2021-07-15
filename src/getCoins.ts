import { successResponse, wrap, IResponse } from "./utils";
import dynamodb from "./utils/dynamodb";

const handler = async (
  _event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const coins = await dynamodb.get({
    Key: {
      PK: "coingeckoCoins",
      SK: 0,
    }
  })
  return successResponse(coins.Item?.coins, 10 * 60); // 10 mins cache
};

export default wrap(handler);
