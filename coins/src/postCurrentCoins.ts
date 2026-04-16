import { successResponse, wrap, IResponse } from "./utils/shared";
import parseRequestBody from "./utils/shared/parseRequestBody";
import {
  CoinsResponse,
  batchGetLatest,
  getBasicCoins,
} from "./utils/getCoinsUtils";
import { quantisePeriod } from "./utils/timestampUtils";

const searchWidth = quantisePeriod("12h");

const isFresh = (timestamp: number) => {
  if (!timestamp) return true;
  const now = Date.now() / 1e3;
  return now - timestamp < searchWidth;
};

const handler = async (event: any): Promise<IResponse> => {
  const body = parseRequestBody(event.body);
  const requestedCoins: string[] = body.coins;
  const { PKTransforms, coins } = await getBasicCoins(requestedCoins);
  const response = {} as CoinsResponse;
  const coinsWithRedirect = {} as { [redirect: string]: any[] };
  coins.forEach((coin) => {
    if (typeof coin.decimals === 'string' && !isNaN(Number(coin.decimals)))
      coin.decimals = Number(coin.decimals);

    if (coin.redirect === undefined) {
      if (isFresh(coin.timestamp)) {
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
        if (isFresh(redirectedCoin.timestamp)) {
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
