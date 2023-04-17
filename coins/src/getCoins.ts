import { successResponse, wrap, IResponse } from "./utils/shared";
import ddb, { batchGet } from "./utils/shared/dynamodb";
import parseRequestBody from "./utils/shared/parseRequestBody";
import getRecordClosestToTimestamp from "./utils/shared/getRecordClosestToTimestamp";
import { coinToPK, DAY, PKToCoin } from "./utils/processCoin";
import { CoinsResponse } from "./utils/getCoinsUtils";

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const body = parseRequestBody(event.body)
  const requestedCoins = body.coins;
  const timestampRequested = body.timestamp
  const coins = await batchGet(requestedCoins.map((coin: string) => ({
    PK: coinToPK(coin),
    SK: 0,
  })));
  const response = {} as CoinsResponse
  await Promise.all(coins.map(async coin => {
    const coinName = PKToCoin(coin.PK);
    let formattedCoin = {
      decimals: coin.decimals,
      price: coin.price,
      symbol: coin.symbol,
      timestamp: coin.timestamp,
    }
    if(timestampRequested === undefined){
      if(coin.redirect){
        const redirectedCoin = await ddb.get({
          PK: coin.redirect,
          SK: 0
        })
        if(redirectedCoin.Item === undefined){
          return
        }
        formattedCoin.price = redirectedCoin.Item.price;
        formattedCoin.timestamp = redirectedCoin.Item.timestamp;
      }
    } else {
      const finalCoin = await getRecordClosestToTimestamp(
        coin.redirect ?? coin.PK,
        Number(timestampRequested),
        DAY * 2,
      )
      if (finalCoin.SK === undefined) return;
      formattedCoin.price = finalCoin.price;
      formattedCoin.timestamp = finalCoin.SK;
    }
    response[coinName] = formattedCoin;
  }))
  return successResponse({
    coins: response
  });
};

export default wrap(handler);
