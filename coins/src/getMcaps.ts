import { successResponse, wrap, IResponse } from "./utils/shared";
import ddb, { batchGet } from "./utils/shared/dynamodb";
import parseRequestBody from "./utils/shared/parseRequestBody";
import { coinToPK, PKToCoin } from "./utils/processCoin";

type McapsResponse = {
  [coin: string]: {
    mcap: number;
    timestamp: number;
  };
};

const handler = async (
  event: AWSLambda.APIGatewayEvent,
): Promise<IResponse> => {
  const body = parseRequestBody(event.body);
  const requestedCoins = body.coins;
  const coins = await batchGet(
    requestedCoins.map((coin: string) => ({
      PK: coinToPK(coin),
      SK: 0,
    })),
  );
  const response = {} as McapsResponse;
  await Promise.all(
    coins.map(async (coin) => {
      const coinName = PKToCoin(coin.PK);
      const formattedCoin = {
        mcap: coin.mcap,
        timestamp: coin.timestamp,
      };
      if (coin.redirect) {
        const redirectedCoin = await ddb.get({
          PK: coin.redirect,
          SK: 0,
        });
        if (redirectedCoin.Item === undefined) {
          return;
        }
        // only pass confidence from redirect if the addres is from CG
        if (coin.confidence == 0.99)
          formattedCoin.mcap = redirectedCoin.Item?.mcap;
        formattedCoin.timestamp = redirectedCoin.Item?.timestamp;
      }
      response[coinName] = formattedCoin;
    }),
  );
  return successResponse(response);
};

export default wrap(handler);
