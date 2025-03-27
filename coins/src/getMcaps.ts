import { successResponse, wrap, IResponse } from "./utils/shared";
import ddb from "./utils/shared/dynamodb";
import parseRequestBody from "./utils/shared/parseRequestBody";
import { getBasicCoins } from "./utils/getCoinsUtils";

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
  const {PKTransforms, coins} = await getBasicCoins(requestedCoins)
  const response = {} as McapsResponse;
  await Promise.all(
    coins.map(async (coin) => {
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
        if (redirectedCoin.Item?.mcap)
          formattedCoin.mcap = redirectedCoin.Item?.mcap;
        formattedCoin.timestamp = redirectedCoin.Item?.timestamp;
      }
      response[PKTransforms[coin.PK]] = formattedCoin;
    }),
  );
  return successResponse(response);
};

export default wrap(handler);
