import { successResponse, wrap, IResponse } from "./utils/shared";
import {
  CoinsResponse,
  batchGetLatest,
  getBasicCoins,
  redisCurrentPrices,
  chCurrentPrices,
} from "./utils/getCoinsUtils";
import { quantisePeriod } from "./utils/timestampUtils";

const isFresh = (timestamp: number, searchWidth: number) => {
  if (!timestamp) return true;
  const now = Date.now() / 1e3;
  return now - timestamp < searchWidth;
};

function buildFreshResponse(result: CoinsResponse, searchWidth: number): CoinsResponse {
  const filtered: CoinsResponse = {};
  for (const [coin, data] of Object.entries(result)) {
    if (isFresh(data.timestamp, searchWidth)) {
      filtered[coin] = data;
    }
  }
  return filtered;
}

const handler = async (event: any): Promise<IResponse> => {
  const requestedCoins = (event.pathParameters?.coins ?? "").split(",");
  const searchWidth: number = quantisePeriod(
    event.queryStringParameters?.searchWidth?.toLowerCase() ?? "12h",
  );

  const makeExpiry = () => {
    const date = new Date();
    const minutes = date.getMinutes();
    date.setMinutes(minutes + 5 - (minutes % 5));
    date.setSeconds(20);
    return date.toUTCString();
  };

  // Layer 1: Try Redis
  const redisResult = await redisCurrentPrices(requestedCoins);
  if (redisResult) {
    return successResponse({ coins: buildFreshResponse(redisResult, searchWidth) }, undefined, { Expires: makeExpiry() });
  }

  // Layer 2: Try ClickHouse (fallback when Redis is down)
  const chResult = await chCurrentPrices(requestedCoins);
  if (chResult) {
    return successResponse({ coins: buildFreshResponse(chResult, searchWidth) }, undefined, { Expires: makeExpiry() });
  }

  // Layer 3: Fallback to DDB (existing code)
  const { PKTransforms, coins } = await getBasicCoins(requestedCoins);
  const response = {} as CoinsResponse;
  const coinsWithRedirect = {} as { [redirect: string]: any[] };
  coins.forEach((coin) => {
    if (typeof coin.decimals === 'string' && !isNaN(Number(coin.decimals)))
      coin.decimals = Number(coin.decimals);

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

            if (typeof ogCoin.decimals === 'string' && !isNaN(Number(ogCoin.decimals)))
              ogCoin.decimals = Number(ogCoin.decimals);

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
