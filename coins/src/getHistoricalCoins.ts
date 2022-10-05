import { successResponse, wrap, IResponse } from "./utils/shared";
import getRecordClosestToTimestamp from "./utils/shared/getRecordClosestToTimestamp";
import { DAY } from "./utils/processCoin";
import { CoinsResponse, getBasicCoins } from "./utils/getCoinsUtils";
import { storeMissingCoins } from "./utils/missingCoins";

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const requestedCoins = (event.pathParameters?.coins?? "").split(',');
  const timestampRequested = Number(event.pathParameters!.timestamp)
  const {PKTransforms, coins} = await getBasicCoins(requestedCoins)
  const response = {} as CoinsResponse
  await Promise.all(coins.map(async coin => {
    const finalCoin = await getRecordClosestToTimestamp(coin.redirect ?? coin.PK, timestampRequested, DAY / 4);
    if (finalCoin.SK === undefined) {
        return
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
