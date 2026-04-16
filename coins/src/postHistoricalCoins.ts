require("dotenv").config();
import { successResponse, wrap, IResponse } from "./utils/shared";
import { getRecordClosestToTimestamp } from "./utils/shared/getRecordClosestToTimestamp";
import parseRequestBody from "./utils/shared/parseRequestBody";
import { CoinsResponse, getBasicCoins } from "./utils/getCoinsUtils";
import { quantisePeriod } from "./utils/timestampUtils";

const searchWidth = quantisePeriod("12h");

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const body = parseRequestBody(event.body);
  const requestedCoins: string[] = body.coins;
  const timestampRequested = Number(body.timestamp);
  const { PKTransforms, coins } = await getBasicCoins(requestedCoins);
  const response = {} as CoinsResponse;
  await Promise.all(
    coins.map(async (coin) => {
      const finalCoin = await getRecordClosestToTimestamp(
        coin.redirect ?? coin.PK,
        timestampRequested,
        searchWidth
      );
      if (finalCoin?.SK === undefined) {
        return;
      }

      if (typeof coin?.decimals === 'string' && !isNaN(Number(coin.decimals)))
        coin.decimals = Number(coin.decimals);

      PKTransforms[coin.PK].forEach((coinName) => {
        response[coinName] = {
          decimals: coin.decimals,
          symbol: coin.symbol,
          price: finalCoin!.price,
          timestamp: finalCoin!.SK,
          confidence: finalCoin!.confidence
        };
      });
    })
  );
  return successResponse(
    {
      coins: response
    },
    3600
  );
};

export default wrap(handler);
