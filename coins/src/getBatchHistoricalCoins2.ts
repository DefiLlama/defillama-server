import {
  successResponse,
  wrap,
  IResponse,
  errorResponse,
} from "./utils/shared";
import { getBasicCoins } from "./utils/getCoinsUtils";
import { lowercaseAddress } from "./utils/processCoin";
import { runInPromisePool } from "@defillama/sdk/build/generalUtil";
import ddb from "./utils/shared/dynamodb";

async function getRecordClosestToTimestamp2(
  PK: any,
  timestamp: number,
) {
  // Fetch the first item >= timestamp (ascending order)
  const greaterEqualQuery = ddb.query({
    ExpressionAttributeValues: {
      ":pk": PK,
      ":timestamp": timestamp
    },
    KeyConditionExpression: "PK = :pk AND SK >= :timestamp",
    ScanIndexForward: true, // ascending order
    Limit: 1 // only need the first item
  });

  // Fetch the first item <= timestamp (descending order)
  const lessEqualQuery = ddb.query({
    ExpressionAttributeValues: {
      ":pk": PK,
      ":timestamp": timestamp
    },
    KeyConditionExpression: "PK = :pk AND SK <= :timestamp",
    ScanIndexForward: false, // descending order
    Limit: 1 // only need the first item
  });

  const [greaterEqualResult, lessEqualResult] = await Promise.all([
    greaterEqualQuery,
    lessEqualQuery
  ]);

  const greaterEqualItem = greaterEqualResult.Items?.[0];
  const lessEqualItem = lessEqualResult.Items?.[0];

  // If neither exists, return undefined SK
  if (!greaterEqualItem && !lessEqualItem) {
    return {
      SK: undefined
    };
  }

  // If only one exists, return it
  if (!greaterEqualItem) {
    return lessEqualItem;
  }
  if (!lessEqualItem) {
    return greaterEqualItem;
  }

  // Both exist, pick the closest one to timestamp
  const greaterEqualDiff = Math.abs(greaterEqualItem.SK - timestamp);
  const lessEqualDiff = Math.abs(lessEqualItem.SK - timestamp);

  return greaterEqualDiff < lessEqualDiff ? greaterEqualItem : lessEqualItem;
}

async function fetchDBData(
  coinsObj: any,
  coins: any[],
  coinQueries: string[],
  PKTransforms: { [key: string]: string[] }
) {
  let response = {} as any;
  const promises: Promise<any>[] = [];

  coinQueries.map((coinAddress) => {
    const timestamps: number[] = coinsObj[coinAddress as keyof typeof coins];
    if (isNaN(timestamps.length)) return;
    const coin = coins.find((c) =>
      c.PK.includes(
        coinAddress.includes("coingecko")
          ? coinAddress.replace(":", "#").toLowerCase()
          : lowercaseAddress(coinAddress)
      )
    );
    if (coin == null) return;
    promises.push(
      ...timestamps.map(async (timestamp) => {
        const finalCoin = await getRecordClosestToTimestamp2(
          coin.redirect ?? coin.PK,
          timestamp
        );
        if (finalCoin.SK === undefined) {
          return;
        }
        PKTransforms[coin.PK].forEach((coinName) => {
          if (response[coinName] == undefined) {
            response[coinName] = {
              symbol: coin.symbol,
              prices: [
                {
                  timestamp: finalCoin.SK,
                  price: finalCoin.price,
                  confidence: coin.confidence,
                },
              ],
            };
          } else {
            response[coinName].prices.push({
              timestamp: finalCoin.SK,
              price: finalCoin.price,
              confidence: coin.confidence,
            });
          }
        });
      })
    );
  });

  await runInPromisePool({
    items: promises,
    concurrency: 7,
    processor: async (promise: any) => await promise,
  });

  return response;
}

const handler = async (event: any): Promise<IResponse> => {
  try {
    const coinsObj = JSON.parse(event.queryStringParameters?.coins ?? "{}");
    const coinQueries: string[] = Object.keys(coinsObj);
    if (coinQueries.length == 0)
      return errorResponse({ message: "no coins queried" });
    const { PKTransforms, coins } = await getBasicCoins(coinQueries);

    const dbData = await fetchDBData(
      coinsObj,
      coins,
      coinQueries,
      PKTransforms
    );

    return successResponse({ coins: dbData }, 3600); // 1 hour cache
  } catch (e: any) {
    console.log('Error in getBatchHistoricalCoins', event.queryStringParameters?.coins, e)
    return errorResponse({ message: e.stack });
  }
};

export default wrap(handler);