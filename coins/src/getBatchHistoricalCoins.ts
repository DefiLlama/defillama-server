import {
  successResponse,
  wrap,
  IResponse,
  errorResponse,
} from "./utils/shared";
import { getRecordClosestToTimestamp } from "./utils/shared/getRecordClosestToTimestamp";
import { quantisePeriod } from "./utils/timestampUtils";
import { getBasicCoins } from "./utils/getCoinsUtils";
import { runInPromisePool } from "@defillama/sdk/build/generalUtil";

const defaultSearchWidth = quantisePeriod("6h");

export async function fetchDBData(
  coinsObj: any,
  searchWidth: number = defaultSearchWidth
) {
  let response = {} as any;
  const tasks: Array<() => Promise<void>> = [];

  const coinQueries: string[] = Object.keys(coinsObj);
  const { PKTransforms, coins } = await getBasicCoins(coinQueries);

  coins.forEach((coin) => {
    PKTransforms[coin.PK].forEach((coinName) => {
      const timestamps: number[] = coinsObj[coinName];
      if (!Array.isArray(timestamps)) return;
      tasks.push(
        ...timestamps.map((timestamp) => async () => {
          const finalCoin: any = await getRecordClosestToTimestamp(
            coin.redirect ?? coin.PK,
            timestamp,
            searchWidth
          );
          if (finalCoin?.SK === undefined) {
            return;
          }
          if (response[coinName] == undefined) {
            response[coinName] = {
              symbol: coin.symbol,
              prices: [
                {
                  timestamp: finalCoin.SK,
                  price: Number(finalCoin.price),
                  confidence: coin.confidence,
                },
              ],
            };
          } else {
            response[coinName].prices.push({
              timestamp: finalCoin.SK,
              price: Number(finalCoin.price),
              confidence: coin.confidence,
            });
          }
        })
      );
    });
  });

  await runInPromisePool({
    items: tasks,
    concurrency: 7,
    processor: async (task: () => Promise<void>) => task(),
  });

  return response;
}

const handler = async (event: any): Promise<IResponse> => {
  try {
    const coinsObj = JSON.parse(event.queryStringParameters?.coins ?? "{}");
    const coinQueries: string[] = Object.keys(coinsObj);
    if (coinQueries.length == 0)
      return errorResponse({ message: "no coins queried" });
    const searchWidth: number = quantisePeriod(
      event.queryStringParameters?.searchWidth?.toLowerCase() ?? "6h"
    );

    const dbData = await fetchDBData(coinsObj, searchWidth);

    return successResponse({ coins: dbData }, 3600); // 1 hour cache
  } catch (e: any) {
    console.log('Error in getBatchHistoricalCoins', event.queryStringParameters?.coins, e)
    return errorResponse({ message: e.stack });
  }
};

export default wrap(handler);

// handler({
//   queryStringParameters: {
//     coins: JSON.stringify({
//       "ethereum:0xa0b73e1ff0b80914ab6fe0444e65848c4c34450b": [
//         1704495352,
//         1703890552,
//         1701903352,
//       ],
//       "bsc:0xacc234978a5eb941665fd051ca48765610d82584": [
//         1704495352,
//         1703890552,
//         1701903352,
//       ],
//       "ethereum:0x8A9C67fee641579dEbA04928c4BC45F66e26343A": [
//         1704495352,
//         1703890552,
//         170190335,
//       ],
//     }),
//   },
// });
// // ts-node coins/src/getBatchHistoricalCoins.ts
