require("dotenv").config();
import {
  successResponse,
  wrap,
  IResponse,
  errorResponse,
} from "./utils/shared";
import { getBasicCoins } from "./utils/getCoinsUtils";
import dynamodb from "./utils/shared/dynamodb";
import { getRecordClosestToTimestamp } from "./utils/shared/getRecordClosestToTimestamp";
import { getCurrentUnixTimestamp } from "./utils/date";
import { quantisePeriod, getTimestampsArray } from "./utils/timestampUtils";
import pLimit from "p-limit";


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
    period: quantisePeriod("d"),
  };

  if (event.queryStringParameters) {
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
            message: `${p} is an invalid param`,
          });
          continue;
      }

      params[p] = uintCheck(value, p);
    }
  }
  if (!params.start && !params.end) params.end = getCurrentUnixTimestamp();
  if (!("searchWidth" in params)) params.searchWidth = params.period / 10;

  return params;
}

// Fetches all records for a PK in a single paginated range query till the limit is reached
// DynamoDB returns items sorted ascending by SK by default.
async function queryRangeLimited(pk: string, minSK: number, maxSK: number, limit = 1000) {
  const items: any[] = [];
  let lastKey: any = undefined;
  // do {  // Pagination is currently disabled since we want to change strategy to per-timestamp queries for large periods, but the function is left here for potential future use if we want to fetch more records at once.
  const result = await dynamodb.query({
    ExpressionAttributeValues: { ":pk": pk, ":minSK": minSK, ":maxSK": maxSK },
    KeyConditionExpression: "PK = :pk AND SK BETWEEN :minSK AND :maxSK",
    ExclusiveStartKey: lastKey,
    Limit: limit, // max items per page
  });
  if (result.Items) items.push(...result.Items);
  //   lastKey = result.LastEvaluatedKey;
  // } while (lastKey);
  return {
    items,
    limitReached: items.length >= limit,
  };
}

// Binary search for the record closest to `timestamp` within the sorted records array.
function findClosestRecord(records: any[], timestamp: number, searchWidth: number) {
  let lo = 0, hi = records.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (records[mid].SK < timestamp) lo = mid + 1;
    else hi = mid;
  }
  let best: any = undefined;
  let bestDiff = Infinity;
  for (const idx of [lo - 1, lo]) {
    if (idx >= 0 && idx < records.length) {
      const diff = Math.abs(records[idx].SK - timestamp);
      if (diff < bestDiff) { bestDiff = diff; best = records[idx]; }
    }
  }
  if (!best || bestDiff > searchWidth) return undefined;
  return best;
}

function addToResponse(
  response: PriceChartResponse,
  coin: any,
  record: any,
  PKTransforms: { [key: string]: string[] },
) {
  PKTransforms[coin.PK].forEach((coinName) => {
    if (response[coinName] == undefined) {
      response[coinName] = {
        symbol: coin.symbol,
        confidence: coin.confidence,
        decimals: coin.decimals,
        prices: [{ timestamp: record.SK, price: record.price }],
      };
    } else {
      response[coinName].prices.push({
        timestamp: record.SK,
        price: record.price,
      });
    }
  });
}

// Strategy selection: we pick between two DynamoDB access patterns per coin.
//
// Range query (queryRange + findClosestRecord):
//   - 1 paginated query fetches ALL records in [min-searchWidth, max+searchWidth]
//   - Matches timestamps in memory via binary search (O(log n) per timestamp)
//   - Cost scales with total records in the range, regardless of how many we need
//   - Best when the range is small or data is sparse (few records relative to timestamps)
//
// Per-timestamp query (getRecordClosestToTimestamp):
//   - 2 queries per timestamp, each with Limit:1 (one forward, one backward)
//   - Cost scales with number of timestamps, regardless of data density
//   - Best when requesting few sparse points from a densely-populated range
//   - Example: 30 daily points over 30 days with minutely data = 43K records in
//     range vs 60 targeted queries reading 60 items total
//
// Threshold: periods under 12h produce compact ranges where a single range query
// is always efficient. Larger periods (1d+) spread points across wide ranges that
// may contain tens of thousands of dense records, so per-timestamp is cheaper.
const RANGE_QUERY_MAX_PERIOD = 12 * 60 * 60; // 12 hours
const MAX_RECORDS = 500;

const limit = pLimit(20);

async function fetchDBData(
  params: QueryParams,
  timestamps: number[],
  coins: any[],
  PKTransforms: { [key: string]: string[] },
) {
  let response = {} as PriceChartResponse;
  const minTimestamp = Math.min(...timestamps);
  const maxTimestamp = Math.max(...timestamps);

  const useRangeQuery = params.period < RANGE_QUERY_MAX_PERIOD;

  for (const coin of coins) {
    const pk = coin.redirect ?? coin.PK;

    // Per-timestamp queries: 2 DynamoDB queries each with Limit:1.
    // Cheaper when the time range is large relative to requested points,
    // avoiding fetching thousands of unneeded records from dense coins.
    const runSingleQueries = async () => await Promise.all(
      timestamps.map((timestamp) =>
        limit(async () => {
          const finalCoin: any = await getRecordClosestToTimestamp(
            pk,
            timestamp,
            params.searchWidth,
          );
          if (finalCoin.SK === undefined) return;
          addToResponse(response, coin, finalCoin, PKTransforms);
        }),
      ),
    );

    if (useRangeQuery) {
      // Single range query: fetch all records at once, match in memory.
      // Efficient for short time spans or small period values (e.g. 5m, 1h).
      const {items: records, limitReached } = await queryRangeLimited(
        pk,
        minTimestamp - params.searchWidth,
        maxTimestamp + params.searchWidth,
      );

      if (limitReached) {
        // console.log(`${pk} returns too many logs, switching to single queries`)
        await runSingleQueries();
        continue;
      }

      for (const timestamp of timestamps) {
        const finalCoin = findClosestRecord(records, timestamp, params.searchWidth);
        if (!finalCoin || finalCoin.SK === undefined) continue;
        addToResponse(response, coin, finalCoin, PKTransforms);
      }
    } else {
      await runSingleQueries();
    }
  }

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
  if (paramError) return errorResponse(paramError);

  const timestamps: number[] = getTimestampsArray(
    params.end == null ? params.start : params.end,
    params.end == null,
    params.period,
    params.span,
  );

  const totalRecords = params.coins.length * timestamps.length;
  if (totalRecords > MAX_RECORDS) {
    return errorResponse({
      message: `Requested ${totalRecords} data points (${params.coins.length} coins × ${timestamps.length} timestamps) exceeds the maximum of ${MAX_RECORDS}. Reduce the number of coins or the span.`,
    });
  }

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
