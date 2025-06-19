import { successResponse, wrap, IResponse } from "./utils/shared";
import {
  CoinsResponse,
  batchGetLatest,
  getBasicCoins,
} from "./utils/getCoinsUtils";
import { quantisePeriod } from "./utils/timestampUtils";

const isFresh = (timestamp: number, searchWidth: number) => {
  if (!timestamp) return true;
  const now = Date.now() / 1e3;
  return now - timestamp < searchWidth;
};

const handler = async (event: any): Promise<IResponse> => {
  const requestedCoins = (event.pathParameters?.coins ?? "").split(",");
  const searchWidth: number = quantisePeriod(
    event.queryStringParameters?.searchWidth?.toLowerCase() ?? "12h",
  );
  const { PKTransforms, coins } = await getBasicCoins(requestedCoins);
  const response = {} as CoinsResponse;
  const coinsWithRedirect = {} as { [redirect: string]: any[] };
  coins.forEach((coin) => {
    if (coin.redirect === undefined) {
      if (isFresh(coin.timestamp, searchWidth)) {
        PKTransforms[coin.PK].forEach((coinName) => {
          response[coinName] = {
            decimals: coin.decimals,
            price: coin.price,
            symbol: coin.symbol.replace(/\0/g, ""),
            timestamp: coin.timestamp,
            confidence: coin.confidence,
          };
        });
      }
    } else {
      coinsWithRedirect[coin.redirect] = [
        ...(coinsWithRedirect[coin.redirect] ?? []),
        coin,
      ];
    }
  });
  const redirects = Object.keys(coinsWithRedirect);
  if (redirects.length > 0) {
    const resolvedRedirectedCoins = await batchGetLatest(redirects);
    resolvedRedirectedCoins.forEach((redirectedCoin) => {
      coinsWithRedirect[redirectedCoin.PK].forEach((ogCoin) => {
        if (isFresh(redirectedCoin.timestamp, searchWidth)) {
          PKTransforms[ogCoin.PK].forEach((coin) => {
            response[coin] = {
              decimals: ogCoin.decimals,
              symbol: ogCoin.symbol.replace(/\0/g, ""),
              price: redirectedCoin.price,
              timestamp: redirectedCoin.timestamp,
              confidence: redirectedCoin.confidence,
            };
          });
        }
      });
    });
  }

  // Coingecko price refreshes happen each 5 minutes, set expiration at the :00; :05, :10, :15... mark, with 20 seconds extra
  const date = new Date();
  const minutes = date.getMinutes();
  date.setMinutes(minutes + 5 - (minutes % 5));
  date.setSeconds(20);
  return successResponse(
    {
      coins: response,
    },
    undefined,
    {
      Expires: date.toUTCString(),
    },
  );
};

export default wrap(handler);

handler({
  pathParameters: {
    coins:
      "sei:0x3894085ef7ff0f0aedf52e2a2704928d1ec074f1,sei:0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1",
  },
}); // ts-node coins/src/getCurrentCoins.ts
