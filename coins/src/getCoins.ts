import { successResponse, wrap, IResponse } from "./utils/shared";
import ddb, { batchGet } from "./utils/shared/dynamodb";
import parseRequestBody from "./utils/shared/parseRequestBody";

function cutStartWord(text:string, startWord:string){
  return text.substr(startWord.length)
}

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const requestedCoins = parseRequestBody(event.body).coins;
  const coins = await batchGet(requestedCoins.map((coin: string) => ({
    PK: coin.startsWith("coingecko:")?`coingecko#${cutStartWord(coin, "coingecko:")}`:`asset#${coin}`,
    SK: 0,
  })));
  const response = {} as {
    [coin:string]:{
      decimals:number,
      price:number,
      timestamp: number,
      symbol: string,
    }
  }
  await Promise.all(coins.map(async coin=>{
    const coinName = coin.PK.startsWith("asset#")?
      cutStartWord(coin.PK, "asset#"):
      `coingecko:${cutStartWord(coin.PK, "coingecko#")}`;
    const formattedCoin = {
      decimals: coin.decimals,
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
    response[coinName] = formattedCoin;
  }))
  return successResponse({
    coins: response
  });
};

export default wrap(handler);
