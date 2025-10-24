import {
  successResponse,
  wrap,
  IResponse,
  errorResponse,
} from "./utils/shared";
import getRecordClosestToTimestamp from "./utils/shared/getRecordClosestToTimestamp";
import { quantisePeriod } from "./utils/timestampUtils";
import { getBasicCoins } from "./utils/getCoinsUtils";
import { lowercaseAddress } from "./utils/processCoin";

function generateTimestamps(
  startTimestamp: number,
  spanDays: number,
) : number[] {
  const timestamps: number[] = [];
  const secondsInDay = 86400;
  timestamps.push(startTimestamp);
  if (spanDays <= 0) {
    return timestamps;
  }
  for (let i = 1; i <= spanDays; i++) {
    timestamps.push(startTimestamp + (i * secondsInDay));
  }
  return timestamps;
}

async function fetchDBData(
  coinsObj: Record<string, number>,
  span: number,
  coins: any[],
  coinQueries: string[],
  PKTransforms: { [key: string]: string[] },
  searchWidth: number,
) {
  let response = {} as any;
  const promises: Promise<any>[] = [];

  coinQueries.forEach((coinAddress) => {
    const startTimestamp = coinsObj[coinAddress];
    if (!startTimestamp) return;
    
    const timestamps = generateTimestamps(startTimestamp, span);
    
    const coin = coins.find((c) =>
      c.PK.includes(
        coinAddress.includes("coingecko")
          ? coinAddress.replace(":", "#").toLowerCase()
          : lowercaseAddress(coinAddress),
      ),
    );
    if (coin == null) return;
    
    promises.push(
      ...timestamps.map(async (timestamp) => {
        const finalCoin = await getRecordClosestToTimestamp(
          coin.redirect ?? coin.PK,
          timestamp,
          searchWidth,
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
      }),
    );
  });

  await Promise.all(promises);
  return response;
}

const handler = async (event: any): Promise<IResponse> => {
  try {
    const coinsObj = JSON.parse(event.queryStringParameters?.coins ?? "{}");
    const coinQueries: string[] = Object.keys(coinsObj);
    
    if (coinQueries.length == 0)
      return errorResponse({ message: "no coins queried" });
    
    const span: number = parseInt(event.queryStringParameters?.span ?? "0", 10);
    if (isNaN(span)) {
      return errorResponse({ message: "invalid span parameter" });
    }
    const searchWidth: number = quantisePeriod(
      event.queryStringParameters?.searchWidth?.toLowerCase() ?? "6h",
    );
    
    const { PKTransforms, coins } = await getBasicCoins(coinQueries);

    const dbData = await fetchDBData(
      coinsObj,
      span,
      coins,
      coinQueries,
      PKTransforms,
      searchWidth,
    );

    return successResponse({ coins: dbData }, 3600); // 1 hour cache
  } catch (e: any) {
    return errorResponse({ message: e.stack });
  }
};

export default wrap(handler);

// // ts-node coins/src/getBatchHistoricalCoinsSpan.ts
