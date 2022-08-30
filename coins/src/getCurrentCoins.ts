import { successResponse, wrap, IResponse } from "./utils/shared";
import { coinToPK } from "./utils/processCoin";
import { CoinsResponse, batchGetLatest, getBasicCoins } from "./utils/getCoinsUtils";

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const requestedCoins = (event.queryStringParameters?.coins?? "").split(',');
  const {PKTransforms, coins} = await getBasicCoins(requestedCoins)
  const response = {} as CoinsResponse
  const coinsWithRedirect = {} as {[redirect:string]:any[]}
  coins.forEach(coin=>{
    if(coin.redirect === undefined){
        response[PKTransforms[coin.PK]] = {
            decimals: coin.decimals,
            price: coin.price,
            symbol: coin.symbol,
            timestamp: coin.timestamp,
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
            response[PKTransforms[ogCoin.PK]] = {
                decimals: ogCoin.decimals,
                symbol: ogCoin.symbol,
                price: redirectedCoin.price,
                timestamp: redirectedCoin.timestamp,
            }
        })
    })
  }
  return successResponse({
    coins: response
  });
};

export default wrap(handler);
