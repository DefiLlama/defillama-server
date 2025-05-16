require("dotenv").config();
import { successResponse, wrap, IResponse } from "./utils/shared";
import { getBasicCoins } from "./utils/getCoinsUtils";
import { getTimestampsArray, quantisePeriod } from "./utils/timestampUtils";
import { getCurrentUnixTimestamp } from "./utils/date";
import getRecordClosestToTimestamp from "./utils/shared/getRecordClosestToTimestamp";

const samples = 10;

type QueryParams = {
  coins: string[];
  period: number;
  lookForward: string;
  timestamp: number;
  searchWidth: number;
};
function formParamsObject(event: any): QueryParams {
  const coins = (event.pathParameters?.coins ?? "").split(",");
  const period = quantisePeriod(
    event.queryStringParameters?.period?.toLowerCase() ?? "d",
  );
  const lookForward = event.queryStringParameters?.lookForward ?? false;
  const timestamp = quantisePeriod(
    (
      event.queryStringParameters?.timestamp ?? getCurrentUnixTimestamp()
    ).toString(),
  );

  const searchWidthString: string =
    event.queryStringParameters?.searchWidth?.toLowerCase();
  const searchWidth: number = searchWidthString
    ? quantisePeriod(searchWidthString)
    : period / 4;

  return {
    coins,
    period,
    lookForward,
    timestamp,
    searchWidth,
  };
}

async function fetchDBData(
  timestamps: number[],
  coins: any[],
  PKTransforms: any,
  searchWidth: number,
) {
  let response = {} as any;
  const promises: any[] = [];

  coins.map(async (coin) => {
    promises.push(
      ...timestamps.map(async (timestamp) => {
        const finalCoin = await getRecordClosestToTimestamp(
          coin.redirect ?? coin.PK,
          timestamp,
          searchWidth,
        );
        if (finalCoin.SK === undefined) return;
        if (response[PKTransforms[coin.PK]] == undefined)
          response[PKTransforms[coin.PK]] = [finalCoin.volume];
        else response[PKTransforms[coin.PK]].push(finalCoin.volume);
      }),
    );
  });

  await Promise.all(promises);
  return response;
}

function calcAverage(response: any) {
  let results: { [coin: string]: number } = {};

  Object.keys(response).map((c) => {
    if (response[c].length < samples * 0.7)
      return new Error(`unavailable for this time period`);

    const aggregateVolume = response[c].reduce(
      (p: number, c: number) => p + c,
      0,
    );
    results[c] = aggregateVolume / response[c].length;
  });

  return results;
}

const handler = async (event: any): Promise<IResponse> => {
  const params = formParamsObject(event);
  const timestamps = getTimestampsArray(
    params.timestamp,
    params.lookForward == "true",
    params.period,
    samples,
  );
  const { PKTransforms, coins } = await getBasicCoins(params.coins);
  const dbData = await fetchDBData(
    timestamps,
    coins,
    PKTransforms,
    params.searchWidth,
  );

  const response = calcAverage(dbData);

  return successResponse(
    {
      coins: response,
    },
    3600,
  ); // 1 hour cache
};

export default wrap(handler);
