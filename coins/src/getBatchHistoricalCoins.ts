import {
  successResponse,
  wrap,
  IResponse,
  errorResponse
} from "./utils/shared";
import getRecordClosestToTimestamp from "./utils/shared/getRecordClosestToTimestamp";
import { quantisePeriod } from "./utils/timestampUtils";
import { getBasicCoins } from "./utils/getCoinsUtils";
import { lowercaseAddress } from "./utils/processCoin";

async function fetchDBData(
  coinsObj: any,
  coins: any[],
  coinQueries: string[],
  PKTransforms: { [key: string]: string },
  searchWidth: number
) {
  let response = {} as any;
  const promises: Promise<any>[] = [];

  coinQueries.map(async (coinAddress) => {
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
        const finalCoin = await getRecordClosestToTimestamp(
          coin.redirect ?? coin.PK,
          timestamp,
          searchWidth
        );
        if (finalCoin.SK === undefined) {
          return;
        }
        if (response[PKTransforms[coin.PK]] == undefined) {
          response[PKTransforms[coin.PK]] = {
            symbol: coin.symbol,
            prices: [
              {
                timestamp: finalCoin.SK,
                price: finalCoin.price,
                confidence: coin.confidence
              }
            ]
          };
        } else {
          response[PKTransforms[coin.PK]].prices.push({
            timestamp: finalCoin.SK,
            price: finalCoin.price,
            confidence: coin.confidence
          });
        }
      })
    );
  });

  await Promise.all(promises);
  return response;
}

const handler = async (event: any): Promise<IResponse> => {
  const coinsObj = JSON.parse(event.queryStringParameters?.coins ?? "{}");
  const coinQueries: string[] = Object.keys(coinsObj);
  if (coinQueries.length == 0)
    return errorResponse({ message: "no coins queried" });
  const searchWidth: number = quantisePeriod(
    event.queryStringParameters?.searchWidth?.toLowerCase() ?? "6h"
  );
  const { PKTransforms, coins } = await getBasicCoins(coinQueries);

  const dbData = await fetchDBData(
    coinsObj,
    coins,
    coinQueries,
    PKTransforms,
    searchWidth
  );

  return successResponse({ coins: dbData }, 3600); // 1 hour cache
};

export default wrap(handler);
