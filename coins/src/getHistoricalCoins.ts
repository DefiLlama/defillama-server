require("dotenv").config();
import { successResponse, wrap, IResponse } from "./utils/shared";
import getRecordClosestToTimestamp from "./utils/shared/getRecordClosestToTimestamp";
import { CoinsResponse, getBasicCoins } from "./utils/getCoinsUtils";
import { storeMissingCoins } from "./utils/missingCoins";
import { quantisePeriod } from "./utils/timestampUtils";

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const requestedCoins = (event.pathParameters?.coins ?? "").split(",");
  const timestampRequested = Number(event.pathParameters!.timestamp);
  const { PKTransforms, coins } = await getBasicCoins(requestedCoins);
  const searchWidth: number = quantisePeriod(
    event.queryStringParameters?.searchWidth?.toLowerCase() ?? "6h"
  );
  const response = {} as CoinsResponse;
  await Promise.all(
    coins.map(async (coin) => {
      const finalCoin = await getRecordClosestToTimestamp(
        coin.redirect ?? coin.PK,
        timestampRequested,
        searchWidth
      );
      if (finalCoin.SK === undefined) {
        // if (process.env.DEFILLAMA_SDK_MUTED == "true") {
        //   const currentCoin = await getRecordClosestToTimestamp(
        //     coin.redirect ?? coin.PK,
        //     getCurrentUnixTimestamp(),
        //     DAY / 4
        //   );
        //   if (currentCoin.SK == undefined) {
        //     return;
        //   }
        //   await currentCoin.adapter()
        // } else {
        return;
        // }
      }
      response[PKTransforms[coin.PK]] = {
        decimals: coin.decimals,
        symbol: coin.symbol,
        price: finalCoin.price,
        timestamp: finalCoin.SK,
        confidence: finalCoin.confidence,
      };
    }))
  await storeMissingCoins(requestedCoins, response, timestampRequested);
  return successResponse({
      coins: response
    }, 3600); // 1 hour cache
};

export default wrap(handler);