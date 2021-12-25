import { successResponse, wrap, IResponse } from "./utils/shared";
import dynamodb, { TableName } from "./utils/dynamodb";
import parseRequestBody from "./utils/shared/parseRequestBody";

const step = 100; // Max 100 items per batchGet
const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const requestedCoins = parseRequestBody(event.body).coins;
  const requests = [];
  for (let i = 0; i < requestedCoins.length; i += step) {
    requests.push(
      dynamodb
        .batchGet(
          requestedCoins.slice(i, i + step).map((coin: string) => ({
            PK: `asset#${coin}`,
            SK: 0,
          }))
        )
        .then((items) => items.Responses![TableName])
    );
  }
  const returnedCoins = (await Promise.all(requests)).reduce(
    (acc, coins) =>
      acc.concat(
        coins.map((coin) => ({
          decimals: coin.decimals,
          coin: coin.PK.substr("asset#".length),
          price: coin.price,
          symbol: coin.symbol,
          timestamp: coin.timestamp,
        }))
      ),
    []
  );
  return successResponse(returnedCoins);
};

export default wrap(handler);
