import dynamodb from "../utils/shared/dynamodb";
import { Protocol } from "../protocols/data";
import { getDay, getTimestampAtStartOfDay, secondsInDay } from "../utils/date";
import { TokensValueLocked, tvlsObject } from "../types";
import getTVLOfRecordClosestToTimestamp from "../utils/shared/getRecordClosestToTimestamp";
import { sendMessage } from "../utils/discord";
import { saveProtocolItem } from "../api2/db";

type PKconverted = (id: string) => string;
type StoreTvlOptions = {
  protocol: Protocol;
  unixTimestamp: number,
  tvl: tvlsObject<TokensValueLocked>,
  hourlyTvl: PKconverted,
  dailyTvl: PKconverted,
  storePreviousData: boolean,
  overwriteExistingData?: boolean,
}


export default async ({ protocol, unixTimestamp, tvl, hourlyTvl, dailyTvl, storePreviousData, overwriteExistingData, }: StoreTvlOptions) => {
  const hourlyPK = hourlyTvl(protocol.id);
  if (Object.keys(tvl).length === 0) {
    return;
  }

  await dynamodb.put({
    PK: hourlyPK,
    SK: unixTimestamp,
    ...tvl,
  });
  const data = { id: protocol.id, timestamp: unixTimestamp, data: tvl }
  const dayTimestamp = getTimestampAtStartOfDay(unixTimestamp);

  const checkForOutliersCoins = hourlyPK.includes("hourlyUsdTokensTvl") && storePreviousData
  const closestDailyRecord = (overwriteExistingData && !checkForOutliersCoins) ? null : await getTVLOfRecordClosestToTimestamp(
    dailyTvl(protocol.id),
    unixTimestamp,
    secondsInDay * 1.5,
  );

  if (checkForOutliersCoins)
    await checkForOutlierCoins(tvl, closestDailyRecord!, protocol.name);

  if (overwriteExistingData || getDay(closestDailyRecord?.SK) !== getDay(unixTimestamp) || storePreviousData === false) {
    // First write of the day
    await dynamodb.put({
      PK: dailyTvl(protocol.id),
      SK: dayTimestamp,
      ...tvl,
    });
  }

  const writeOptions = { overwriteExistingData };
  await Promise.all([
    saveProtocolItem(hourlyTvl, data, writeOptions),
    saveProtocolItem(dailyTvl, { ...data, timestamp: dayTimestamp }, writeOptions),
  ])
};
async function checkForOutlierCoins(
  currentTvls: tvlsObject<TokensValueLocked>,
  previousTvls: tvlsObject<TokensValueLocked>,
  protocol: string,
) {
  if (process.env.IGNORE_CHECK_OUTLIER_COINS === "true") return;
  const changeThresholdFactor = 4;
  const proportionThresholdFactor = 0.5;
  const outlierThreshold = 20_000_000_000;
  const smallThreshold = 10_000;
  const headline = `${protocol} has TVL values out of accepted range:\n`;
  let alertString = headline;
  const coinKeys: string[] = [];

  Object.keys(currentTvls).map((tvlKey) => {
    const totalChainTvlPrevious = Object.values(
      previousTvls[tvlKey] ?? {},
    ).reduce((p: number, c: number) => p + c, 0);

    Object.keys(currentTvls[tvlKey]).map((coinKey) => {
      const currentCoinValue = currentTvls[tvlKey][coinKey];
      if (currentCoinValue > outlierThreshold)
        alertString += `${coinKey.toUpperCase()} is more than ${outlierThreshold} which is ridiculous, `;
      if (currentCoinValue < smallThreshold) return;
      if (!(tvlKey in previousTvls)) return;
      if (!(coinKey in previousTvls[tvlKey])) return;
      if (coinKey.toUpperCase() in coinKeys) return;

      const previousCoinValue = previousTvls[tvlKey][coinKey];
      const changeUpperBound = previousCoinValue * changeThresholdFactor;
      const changeLowerBound = previousCoinValue / changeThresholdFactor;

      const proportionBoundPrevious =
        totalChainTvlPrevious * proportionThresholdFactor;

      if (
        currentCoinValue > proportionBoundPrevious &&
        (currentCoinValue > changeUpperBound ||
          currentCoinValue < changeLowerBound)
      ) {
        alertString += `${coinKey.toUpperCase()} on ${tvlKey} with previous of ${previousCoinValue} and current of ${currentCoinValue}, `;
        coinKeys.push(coinKey.toUpperCase());
      }
    });
  });

  // if (alertString != headline)
  //   await sendMessage(
  //     alertString,
  //     process.env.STALE_COINS_ADAPTERS_WEBHOOK!,
  //     true,
  //   );
}
