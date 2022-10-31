import { successResponse, wrap, IResponse } from "./utils/shared";
import { CoinsResponse, batchGetLatest, getBasicCoins } from "./utils/getCoinsUtils";
import { storeMissingCoins } from "./utils/missingCoins";
import { quantisePeriod } from "./utils/timestampUtils";

const isFresh = (timestamp:number, searchWidth: number) => {
  const now = Date.now()/1e3;
  return (now - timestamp) < searchWidth;
}

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const requestedCoins = (event.pathParameters?.coins?? "").split(',');
  const searchWidth: number = quantisePeriod(
    event.queryStringParameters?.searchWidth?.toLowerCase() ?? "6h"
  );
  const {PKTransforms, coins} = await getBasicCoins(requestedCoins)
  const response = {} as CoinsResponse
  const coinsWithRedirect = {} as {[redirect:string]:any[]}
  coins.forEach(coin=>{
    if(coin.redirect === undefined){
        if(isFresh(coin.timestamp, searchWidth)){
          response[PKTransforms[coin.PK]] = {
              decimals: coin.decimals,
              price: coin.price,
              symbol: coin.symbol,
              timestamp: coin.timestamp,
              confidence: coin.confidence,
          }
        }
    } else {
        coinsWithRedirect[coin.redirect] = [
            ...(coinsWithRedirect[coin.redirect]??[]),
            coin,
        ]
    }
  })
  const redirects = Object.keys(coinsWithRedirect)
  if(redirects.length > 0){
    const resolvedRedirectedCoins = await batchGetLatest(redirects)
    resolvedRedirectedCoins.forEach(redirectedCoin=>{
        coinsWithRedirect[redirectedCoin.PK].forEach(ogCoin=>{
          if(isFresh(redirectedCoin.timestamp, searchWidth)){
            response[PKTransforms[ogCoin.PK]] = {
                decimals: ogCoin.decimals,
                symbol: ogCoin.symbol,
                price: redirectedCoin.price,
                timestamp: redirectedCoin.timestamp,
                confidence: redirectedCoin.confidence,
            }
          }
        })
    })
  }
  await storeMissingCoins(requestedCoins, response, 0);

  // Coingecko price refreshes happen each 5 minutes, set expiration at the :00; :05, :10, :15... mark, with 20 seconds extra
  const date = new Date()
  const minutes = date.getMinutes()
  date.setMinutes(minutes + 5 - (minutes%5))
  date.setSeconds(20)
  return successResponse({
    coins: response
  }, undefined, {
    "Expires": date.toUTCString(),
  });
};

export default wrap(handler);
