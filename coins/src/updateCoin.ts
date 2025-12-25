import { successResponse, wrap, IResponse } from "./utils/shared";
import {
  CoinsResponse,
  fetchCgPriceData,
  batchGetLatest,
  getBasicCoins,
} from "./utils/getCoinsUtils";
import { setTimer } from "./utils/shared/coingeckoLocks";
import setEnvSecrets from "./utils/shared/setEnvSecrets";
import { getR2, storeR2JSONString } from "./utils/r2";
import { quantisePeriod } from "./utils/timestampUtils";
import { insertCoins } from "./utils/unifiedInserts";

type Coin = {
  PK: string;
  symbol: string;
  decimals: number;
  timestamp: number;
  redirect?: string;
};

const margin = 5 * 60; // 5 mins

const isFresh = (timestamp: number, searchWidth: number) => {
  if (!timestamp) return true;
  const now = Date.now() / 1e3;
  return now - timestamp < searchWidth;
};

const currentCoins = async (
  event: any
): Promise<{
  coins: Coin[];
  PKTransforms: { [key: string]: string[] };
  response: CoinsResponse;
  allRequestedCoins: string[];
  distressedCoins: string[];
}> => {
  const allRequestedCoins = (event.pathParameters?.coins ?? "").split(",");
  const distressedCoins: string[] = [];
  const searchWidth: number = quantisePeriod(
    event.queryStringParameters?.searchWidth?.toLowerCase() ?? "12h"
  );
  const { PKTransforms, coins } = await getBasicCoins(allRequestedCoins);
  const response = {} as CoinsResponse;
  const coinsWithRedirect = {} as { [redirect: string]: any[] };
  coins.forEach((coin) => {
    const isDistressed = coin.distressedFrom ? true : false;
    if (isDistressed) distressedCoins.push(...PKTransforms[coin.PK]);
    if (coin.redirect === undefined) {
      if (isFresh(coin.timestamp, searchWidth)) {
        PKTransforms[coin.PK].forEach((coinName) => {
          response[coinName] = {
            decimals: coin.decimals,
            price: isDistressed ? 0 : coin.price,
            symbol: coin.symbol,
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
          PKTransforms[ogCoin.PK].forEach((coinName) => {
            response[coinName] = {
              decimals: ogCoin.decimals,
              symbol: ogCoin.symbol,
              price:
                redirectedCoin.distressedFrom || ogCoin.distressedFrom
                  ? 0
                  : redirectedCoin.price,
              timestamp: redirectedCoin.timestamp,
              confidence: redirectedCoin.confidence,
            };
          });
        }
      });
    });
  }

  return { response, coins, PKTransforms, allRequestedCoins, distressedCoins };
};

const handler = async (event: any): Promise<IResponse> => {
  // set up env and init promises
  await setEnvSecrets();
  process.env.tableName = "prod-coins-table";
  const start = new Date().getTime();
  const currentPromise = currentCoins(event);
  const bulkPromise: Promise<any> = getR2(`updated-coins`).then((r) =>
    JSON.parse(r.body!)
  );

  const unixStart = Math.floor(start / 1000);
  setTimer();

  // find coins missing from /current/ res
  const { allRequestedCoins, response, PKTransforms, coins, distressedCoins } =
    await currentPromise;
  const requestedCoins = allRequestedCoins.filter(
    (r: string) =>
      !(
        Object.keys(response).includes(r) &&
        response[r].timestamp > unixStart - margin
      )
  );

  if (!requestedCoins.length) {
    const end = new Date().getTime();
    const duration = `${end - start}ms`;
    return successResponse({
      coins: response,
      duration,
    });
  }

  // find cg coins missing from /current/ res
  const cgIds: { [pk: string]: string } = {};
  let bulk: { [id: string]: any } = await bulkPromise;
  coins.map((d: Coin) => {
    if (distressedCoins.includes(PKTransforms[d.PK][0])) return;
    if (!requestedCoins.includes(PKTransforms[d.PK][0])) return;
    if (d.PK in bulk && bulk[d.PK] > unixStart - margin) return;
    if (!d.redirect || !d.redirect.startsWith("coingecko#")) return;
    const id = d.redirect.substring(d.redirect.indexOf("#") + 1);
    if (id in bulk && bulk[id] > unixStart - margin) return;

    cgIds[d.PK] = id;
    bulk[id] = unixStart;
  });

  if (!Object.keys(cgIds).length) {
    const end = new Date().getTime();
    const duration = `${end - start}ms`;
    return successResponse({
      coins: response,
      duration,
    });
  }

  // refetch from cg
  const newData = await fetchCgPriceData(Object.values(cgIds), true);

  const writes: any[] = [];
  coins.map(async ({ PK, symbol, decimals }: Coin) => {
    if (!(PK in cgIds)) return;
    const confidence = 0.99;
    const id = cgIds[PK];
    if (!(id in newData)) return;
    const {
      usd_market_cap: mcap,
      usd: price,
      last_updated_at: SK,
      usd_24h_vol: volume,
    } = newData[id];

    PKTransforms[PK].forEach((coinName) => {
      response[coinName] = {
        decimals,
        price,
        symbol,
        timestamp: SK,
        confidence,
      };
    });

    if (!(PK in bulk && bulk[PK] > unixStart - margin / 2)) {
      writes.push(
        ...[
          {
            PK: `coingecko#${id}`,
            SK: 0,
            price,
            mcap,
            timestamp: SK,
            symbol,
            confidence,
            volume,
            adapter: "updateCoin",
          },
          {
            PK: `coingecko#${id}`,
            SK,
            price,
            confidence,
            adapter: "updateCoin",
            volume,
          },
        ]
      );
    }
    bulk[PK] = unixStart;
  });

  // store fresh data
  await Promise.all([
    insertCoins(writes),
    storeR2JSONString("updated-coins", JSON.stringify(bulk)),
  ]);

  // respond
  const end = new Date().getTime();
  const duration = `${end - start}ms`;
  return successResponse({
    coins: response,
    duration,
  });
};

export default wrap(handler);
