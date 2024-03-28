import { successResponse, wrap, IResponse } from "./utils/shared";
import ddb, { batchGet } from "./utils/shared/dynamodb";
import parseRequestBody from "./utils/shared/parseRequestBody";
import getRecordClosestToTimestamp from "./utils/shared/getRecordClosestToTimestamp";
import { coinToPK, PKToCoin } from "./utils/processCoin";
import { CoinsResponse } from "./utils/getCoinsUtils";
import { getCurrentUnixTimestamp } from "./utils/date";
import { searchWidth } from "./utils/shared/constants";

const handler = async (
  event: any
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
        formattedCoin.symbol = formattedCoin.symbol ?? redirectedCoin.Item.symbol
      }
    } else {
      const finalCoin = await getRecordClosestToTimestamp(
        coin.redirect ?? coin.PK,
        Number(timestampRequested),
        searchWidth,
      )
      if (finalCoin.SK === undefined) return;
      formattedCoin.price = finalCoin.price;
      formattedCoin.timestamp = finalCoin.SK;
      formattedCoin.symbol = formattedCoin.symbol ?? finalCoin.Item.symbol
    }
    if (Math.abs((timestampRequested ?? getCurrentUnixTimestamp()) - formattedCoin.timestamp) < searchWidth)
      response[coinName] = formattedCoin;
  }))
  return successResponse({
    coins: response
  });
};

export default wrap(handler);