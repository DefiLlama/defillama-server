require("dotenv").config();
import { successResponse, wrap, IResponse } from "./utils/shared";
import { getBasicCoins } from "./utils/getCoinsUtils";
import { getTimestampsArray, quantisePeriod } from "./utils/timestampUtils";
import { getCurrentUnixTimestamp } from "./utils/date";
import getRecordClosestToTimestamp from "./utils/shared/getRecordClosestToTimestamp";

type QueryParams = {
  coins: string[];
  period: number;
  lookForward: boolean;
  timestamp: number;
};
type PriceChangeResponse = {
  [coin: string]: number;
};
function formParamsObject(event: any): QueryParams {
  const coins = (event.pathParameters?.coins ?? "").split(",");
  const period = quantisePeriod(
    event.queryStringParameters?.period?.toLowerCase() ?? "d"
  );
  const lookForward = event.queryStringParameters?.lookForward ?? false;
  const timestamp = quantisePeriod(
    (
      event.queryStringParameters?.timestamp ?? getCurrentUnixTimestamp()
    ).toString()
  );
  return {
    coins,
    period,
    lookForward,
    timestamp
  };
}
async function fetchDBData(
  timestamps: number[],
  coins: any[],
  PKTransforms: any
) {
  let response = {} as any;
  const promises: any[] = [];

  coins.map(async (coin) => {
    promises.push(
      ...timestamps.map(async (timestamp) => {
        const finalCoin = await getRecordClosestToTimestamp(
          coin.redirect ?? coin.PK,
          timestamp,
          900
        );
        if (finalCoin.SK === undefined) {
          return;
        }
        if (response[PKTransforms[coin.PK]] == undefined) {
          response[PKTransforms[coin.PK]] = {
            symbol: coin.symbol,
            confidence: coin.confidence,
            prices: [{ timestamp: finalCoin.SK, price: finalCoin.price }]
          };
        } else {
          response[PKTransforms[coin.PK]].prices.push({
            timestamp: finalCoin.SK,
            price: finalCoin.price
          });
        }
      })
    );
  });

  await Promise.all(promises);
  return response;
}
function calcPercentages(response: any, timestamps: number[]) {
  let results = {} as PriceChangeResponse;

  Object.keys(response).map((c) => {
    const data = response[c].prices;
    if (data.length != 2) return new Error(`unavailable for this time period`);
    data.sort((a: any, b: any) => a.timestamp < b.timestamp);
    const priceChange = data[1].price - data[0].price;
    const timeChangeActual = data[1].timestamp - data[0].timestamp;
    const timeChangeRequested = Math.abs(timestamps[0] - timestamps[1]);
    const startPrice = data[0].price;

    results[c] =
      (100 * timeChangeRequested * priceChange) /
      (startPrice * timeChangeActual);
  });

  return results;
}
const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const params = formParamsObject(event);
  const timestamps = getTimestampsArray(
    params.timestamp,
    params.lookForward,
    params.period,
    2
  );
  const { PKTransforms, coins } = await getBasicCoins(params.coins);
  const response: PriceChangeResponse = await fetchDBData(
    timestamps,
    coins,
    PKTransforms
  );
  return successResponse(
    {
      coins: calcPercentages(response, timestamps)
    },
    3600
  ); // 1 hour cache
};

export default wrap(handler);