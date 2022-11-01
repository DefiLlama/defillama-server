require("dotenv").config();
import {
  successResponse,
  wrap,
  IResponse,
  errorResponse
} from "./utils/shared";
import { getBasicCoins } from "./utils/getCoinsUtils";
import getRecordClosestToTimestamp from "./utils/shared/getRecordClosestToTimestamp";
import { getCurrentUnixTimestamp } from "./utils/date";
import { quantisePeriod, getTimestampsArray } from "./utils/timestampUtils";

type TimedPrice = {
  price: number;
  timestamp: number;
};
type PriceChartResponse = {
  [coin: string]: {
    prices: TimedPrice[];
    decimals?: number;
    symbol: string;
    confidence?: number;
  };
};
type QueryParams = {
  coins: string[];
  period: number;
  span: number;
  start: number;
  end: number;
  searchWidth: number;
};
function uintCheck(value: any, name: string) {
  if (value < 0 || isNaN(value))
    return errorResponse({ message: `${name} must be uint` });
  return value;
}
function formParamsObject(event: any): QueryParams {
  const paramKeys: string[] = ["period", "span", "start", "end", "searchWidth"];
  let params: any = { coins: (event.pathParameters?.coins ?? "").split(",") };
  for (let p of paramKeys) {
    let value;
    if (p == "period") {
      value = quantisePeriod(
        event.queryStringParameters?.period?.toLowerCase() ?? "d"
      );
    } else if (p == "searchWidth") {
      value = quantisePeriod(
        event.queryStringParameters?.searchWidth?.toLowerCase() ??
          (params.period / 10).toString()
      );
    } else if (p == "end") {
      value = parseInt(
        event.queryStringParameters?.[p] ?? getCurrentUnixTimestamp()
      );
    } else {
      value = parseInt(event.queryStringParameters?.[p] ?? "0");
    }
    params[p] = uintCheck(value, p);
  }
  if (params.start + params.end == 0) params.end = getCurrentUnixTimestamp();
  return params;
}
async function fetchDBData(
  params: QueryParams,
  timestamps: number[],
  coins: any[],
  PKTransforms: any
) {
  let response = {} as PriceChartResponse;

  const promises: any[] = [];
  coins.map(async (coin) => {
    promises.push(
      ...timestamps.map(async (timestamp) => {
        const finalCoin = await getRecordClosestToTimestamp(
          coin.redirect ?? coin.PK,
          timestamp,
          params.searchWidth
        );
        if (finalCoin.SK === undefined) {
          return;
        }
        if (response[PKTransforms[coin.PK]] == undefined) {
          response[PKTransforms[coin.PK]] = {
            symbol: coin.symbol,
            confidence: coin.confidence,
            decimals: coin.decimals,
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
const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  if (
    event.queryStringParameters?.start != null &&
    event.queryStringParameters?.end != null
  ) {
    return errorResponse({
      message: "use either start or end parameter, not both"
    });
  }
  const params = formParamsObject(event);

  const paramError: any = Object.values(params).find(
    (p: any) => typeof p == "object" && p.length == undefined
  );
  if (paramError) return paramError;

  const timestamps: number[] = getTimestampsArray(
    params.end == 0 ? params.start : params.end,
    params.end == 0,
    params.period,
    params.span
  );

  const { PKTransforms, coins } = await getBasicCoins(params.coins);

  const response: PriceChartResponse = await fetchDBData(
    params,
    timestamps,
    coins,
    PKTransforms
  );
  Object.values(response).map((r: any) =>
    r.prices.sort((a: TimedPrice, b: TimedPrice) =>
      a.timestamp > b.timestamp ? 1 : -1
    )
  );
  return successResponse(
    {
      coins: response
    },
    3600
  ); // 1 hour cache
};

export default wrap(handler);
