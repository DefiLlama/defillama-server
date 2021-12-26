import { successResponse, wrap, IResponse } from "./utils/shared";
import ddb, { batchGet } from "./utils/shared/dynamodb";
import parseRequestBody from "./utils/shared/parseRequestBody";

const step = 100; // Max 100 items per batchGet
const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const requestedCoins = parseRequestBody(event.body).coins;
  const coins = await batchGet(requestedCoins.map((coin: string) => ({
    PK: `asset#${coin}`,
    SK: 0,
  })));
  const returnedCoins = await Promise.all(coins.map(async coin=>{
    const formattedCoin = {
      decimals: coin.decimals,
      coin: coin.PK.substr("asset#".length),
      price: coin.price,
      symbol: coin.symbol,
      timestamp: coin.timestamp,
    }
    if(coin.redirect){
      const redirectedCoin = await ddb.get({
        PK: coin.redirect,
        SK: 0
      })
      formattedCoin.price = redirectedCoin.Item?.price
      formattedCoin.timestamp = redirectedCoin.Item?.timestamp
    }
    return formattedCoin
  }))
  return successResponse(returnedCoins);
};

export default wrap(handler);
