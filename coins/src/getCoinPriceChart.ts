require("dotenv").config();
import {
  successResponse,
  wrap,
  IResponse,
  errorResponse,
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
    return errorResponse({
      message: `${name} is not an uint`,
    });

  return value;
}
function formParamsObject(event: any): QueryParams {
  let params: any = {
    coins: (event.pathParameters?.coins ?? "").split(","),
    span: "0",
    start: "1514764800", // 1/1/18
    period: "d",
  };

  for (let p of Object.keys(event.queryStringParameters)) {
    let value;

    switch (p) {
      case "period":
        value = quantisePeriod(
          event.queryStringParameters?.period?.toLowerCase(),
        );
        break;

      case "searchWidth":
        value = quantisePeriod(
          event.queryStringParameters?.searchWidth?.toLowerCase(),
        );
        break;

      case "end":
        value = parseInt(event.queryStringParameters?.[p]);
        break;

      case "start":
        value = parseInt(event.queryStringParameters?.[p]);
        break;

      case "span":
        value = parseInt(event.queryStringParameters?.[p]);
        break;

      default:
        params[p] = errorResponse({
          message: `${p} is either an invalid param`,
        });
        continue;
    }

    params[p] = uintCheck(value, p);
  }

  if (params.start + params.end == 0) params.end = getCurrentUnixTimestamp();
  if (!("searchWidth" in params)) params.searchWidth = params.period / 10;

  return params;
}
async function fetchDBData(
  params: QueryParams,
  timestamps: number[],
  coins: any[],
  PKTransforms: any,
) {
  let response = {} as PriceChartResponse;
  const promises: any[] = [];

  coins.map(async (coin) => {
    promises.push(
      ...timestamps.map(async (timestamp) => {
        const finalCoin = await getRecordClosestToTimestamp(
          coin.redirect ?? coin.PK,
          timestamp,
          params.searchWidth,
        );
        if (finalCoin.SK === undefined) {
          return;
        }
        if (response[PKTransforms[coin.PK]] == undefined) {
          response[PKTransforms[coin.PK]] = {
            symbol: coin.symbol,
            confidence: coin.confidence,
            decimals: coin.decimals,
            prices: [{ timestamp: finalCoin.SK, price: finalCoin.price }],
          };
        } else {
          response[PKTransforms[coin.PK]].prices.push({
            timestamp: finalCoin.SK,
            price: finalCoin.price,
          });
        }
      }),
    );
  });

  await Promise.all(promises);
  return response;
}
const handler = async (event: any): Promise<IResponse> => {
  if (
    event.queryStringParameters?.start != null &&
    event.queryStringParameters?.end != null
  ) {
    return errorResponse({
      message: "use either start or end parameter, not both",
    });
  }
  const params = formParamsObject(event);

  const paramError: any = Object.values(params).find(
    (p: any) => typeof p == "object" && p.length == undefined,
  );
  if (paramError) return paramError;

  const timestamps: number[] = getTimestampsArray(
    params.end == null ? params.start : params.end,
    params.end == null,
    params.period,
    params.span,
  );

  const { PKTransforms, coins } = await getBasicCoins(params.coins);

  let response: PriceChartResponse = await fetchDBData(
    params,
    timestamps,
    coins,
    PKTransforms,
  );

  Object.values(response).map((r: any) => {
    const unique = r.prices.filter(
      (v: TimedPrice, i: number, a: TimedPrice[]) =>
        a.findIndex((v2) => v2.timestamp === v.timestamp) === i,
    );
    unique.sort((a: TimedPrice, b: TimedPrice) =>
      a.timestamp > b.timestamp ? 1 : -1,
    );
    r.prices = unique;
  });

  return successResponse(
    {
      coins: response,
    },
    3600,
  ); // 1 hour cache
};

export default wrap(handler);
