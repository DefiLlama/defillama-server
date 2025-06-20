import { successResponse, wrap, IResponse } from "./utils/shared";
import { batchWrite } from "./utils/shared/dynamodb";
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
  event: any,
): Promise<{
  coins: Coin[];
  PKTransforms: { [key: string]: string[] };
  response: CoinsResponse;
  allRequestedCoins: string[];
}> => {
  const allRequestedCoins = (event.pathParameters?.coins ?? "").split(",");
  const searchWidth: number = quantisePeriod(
    event.queryStringParameters?.searchWidth?.toLowerCase() ?? "12h",
  );
  const { PKTransforms, coins } = await getBasicCoins(allRequestedCoins);
  const response = {} as CoinsResponse;
  const coinsWithRedirect = {} as { [redirect: string]: any[] };
  coins.forEach((coin) => {
    if (coin.redirect === undefined) {
      if (isFresh(coin.timestamp, searchWidth)) {
        PKTransforms[coin.PK].forEach((coinName) => {
          response[coinName] = {
            decimals: coin.decimals,
            price: coin.price,
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
              price: redirectedCoin.price,
              timestamp: redirectedCoin.timestamp,
              confidence: redirectedCoin.confidence,
            };
          });
        }
      });
    });
  }

  return { response, coins, PKTransforms, allRequestedCoins };
};

const handler = async (event: any): Promise<IResponse> => {
  // set up env and init promises
  await setEnvSecrets();
  process.env.tableName = "prod-coins-table";
  const start = new Date().getTime();
  const currentPromise = currentCoins(event);
  const bulkPromise: Promise<any> = getR2(`updated-coins`).then((r) =>
    JSON.parse(r.body!),
  );

  const unixStart = Math.floor(start / 1000);
  setTimer();

  // find coins missing from /current/ res
  const { allRequestedCoins, response, PKTransforms, coins } =
    await currentPromise;
  const requestedCoins = allRequestedCoins.filter(
    (r: string) =>
      !(
        Object.keys(response).includes(r) &&
        response[r].timestamp > unixStart - margin
      ),
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
          },
          {
            PK: `coingecko#${id}`,
            SK,
            price,
            confidence,
            adapter: "updateCoin",
          },
        ],
      );
    }
    bulk[PK] = unixStart;
  });

  // store fresh data
  await Promise.all([
    batchWrite(writes, false),
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

// handler({
//   pathParameters: {
//     coins:
//       "ethereum:0x1f9840a85d5af5bf1d1762f925bdadDC4201f984,ethereum:0x1f9840a85d5af5bf1d1762f925bdaddc4201f984,base:0x5ae84075f0e34946821a8015dab5299a00992721,fantom:0x582423c10c9e83387a96d00a69ba3d11ee47b7b5,base:0x27d2decb4bfc9c76f0309b8e88dec3a601fe25a8",
//   },
// });
// ts-node coins/src/updateCoin.ts
