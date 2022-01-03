import {
  chainsForBlocks,
  getChainBlocks,
} from "@defillama/sdk/build/computeTVL/blocks";
import BigNumber from "bignumber.js";

import * as Sentry from "@sentry/serverless";

// import { wrapScheduledLambda } from "../utils/shared/wrap";
import {
  getTimestampAtStartOfDay,
  getTimestampAtStartOfHour,
  getTimestampAtStartOfMonth,
} from "../utils/date";
import {
  dailyDexVolumeDb,
  hourlyDexVolumeDb,
  monthlyDexVolumeDb,
  getHourlyDexVolumeRecord,
  getMonthlyDexVolumeRecord,
  hourlyVolumePk,
  dailyVolumePk,
  monthlyVolumePk,
} from "../utils/dexVolumeRecords";
import dexVolumes from "../protocols/dexVolumes";

export const handler = async (event: any) => {
  const currentTimestamp = Date.now() / 1000;
  const hourlyTimestamp = getTimestampAtStartOfHour(currentTimestamp);
  const prevHourlyTimestamp = hourlyTimestamp - 3600;
  const dailyTimestamp = getTimestampAtStartOfDay(currentTimestamp);
  const monthlyTimestamp = getTimestampAtStartOfMonth(currentTimestamp);
  const chainBlocks = await getChainBlocks(hourlyTimestamp, [
    "ethereum",
    ...chainsForBlocks,
  ]);

  event.protocolIndexes.map(async (index: number) => {
    const { id, name, module } = dexVolumes[index];

    const dexVolumeAdapter = await import(
      `../../DefiLlama-Adapters/dexVolumes/${module}`
    );

    const ecosystemFetches = Object.entries(dexVolumeAdapter.volume).map(
      async ([ecosystem, ecosystemFetch]: [string, any]) => {
        let ecosystemFetchResult;

        try {
          ecosystemFetchResult = await ecosystemFetch(
            hourlyTimestamp,
            chainBlocks
          );
        } catch (e) {
          const errorName = `fetch-${name}-${ecosystem}-${hourlyTimestamp}`;
          const scope = new Sentry.Scope();
          scope.setTag("dex-volume", errorName);
          Sentry.AWSLambda.captureException(e, scope);
          throw e;
        }

        return { [ecosystem]: ecosystemFetchResult };
      }
    );

    const protocolVolumes = (await Promise.all(ecosystemFetches)).reduce(
      (acc, volume) => ({ ...acc, ...volume }),
      {}
    );

    console.log(protocolVolumes, "protocolVolumes");

    const getPrevRecords = await Promise.all([
      getHourlyDexVolumeRecord(id, `${prevHourlyTimestamp}`),
      getMonthlyDexVolumeRecord(id, `${monthlyTimestamp}`),
    ]).catch((e) => {
      const errorName = `fetch-prevdata-${name}-${hourlyTimestamp}`;
      const scope = new Sentry.Scope();
      scope.setTag("dex-volume", errorName);
      Sentry.AWSLambda.captureException(e, scope);
      throw e;
    });

    const lastUpdatedData = getPrevRecords[0];
    const monthlyData = getPrevRecords[1];

    // Marks this hourly's volume as inaccurate
    const validPrevHour = !!lastUpdatedData;

    let sumTotalVolume = new BigNumber(0);
    let sumDailyVolume = new BigNumber(0);
    let sumHourlyVolume = new BigNumber(0);

    const newEcosystemHourlyVolumes: {
      [x: string]: {
        [y: string]: string;
      };
    } = {};

    const newEcosystemDailyVolumes: {
      [x: string]: {
        [y: string]: string;
      };
    } = {};

    const newEcosystemTotalVolumes: {
      [x: string]: {
        [y: string]: string;
      };
    } = {};

    // Calc all ecosystem total, daily, hourly volumes and sum them
    Object.entries(protocolVolumes).map(([ecosystem, ecosystemVolume]) => {
      const { totalVolume, dailyVolume, hourlyVolume } = ecosystemVolume;

      const validTotalVolume = typeof totalVolume !== "undefined";
      const validDailyVolume = typeof dailyVolume !== "undefined";
      const validHourlyVolume = typeof hourlyVolume !== "undefined";

      newEcosystemHourlyVolumes[ecosystem] = {};

      // Calculate TotalVolume, if no daily or hourly calc them too
      if (validTotalVolume) {
        const bigNumberTotalVol = new BigNumber(totalVolume);
        newEcosystemTotalVolumes[ecosystem].totalVolume =
          bigNumberTotalVol.toString();
        sumTotalVolume = sumTotalVolume.plus(bigNumberTotalVol);

        if (!validDailyVolume) {
          let calcDailyVolume = bigNumberTotalVol.minus(
            new BigNumber(lastUpdatedData?.totalVolume || 0)
          );
          newEcosystemDailyVolumes[ecosystem].dailyVolume =
            calcDailyVolume.toString();
          sumDailyVolume = sumDailyVolume.plus(calcDailyVolume);
        }

        if (!validHourlyVolume) {
          let calcHourlyVolume = bigNumberTotalVol.minus(
            new BigNumber(lastUpdatedData?.totalVolume || 0)
          );
          newEcosystemHourlyVolumes[ecosystem].hourlyVolume =
            calcHourlyVolume.toString();
          sumHourlyVolume.plus(calcHourlyVolume);
        }
      }

      // Calc daily, if no hourly and total, calc hourly
      if (validDailyVolume) {
        const bigNumberDailyVol = new BigNumber(dailyVolume);
        newEcosystemDailyVolumes[ecosystem].dailyVolume =
          bigNumberDailyVol.toString();
        sumDailyVolume = bigNumberDailyVol;

        if (!validHourlyVolume && !validTotalVolume) {
          if (hourlyTimestamp === dailyTimestamp) {
            newEcosystemHourlyVolumes[ecosystem].hourlyVolume =
              bigNumberDailyVol.toString();
            sumHourlyVolume.plus(bigNumberDailyVol);
          } else {
            let calcHourlyVolume = bigNumberDailyVol.minus(
              new BigNumber(lastUpdatedData?.dailyVolume || 0)
            );
            newEcosystemHourlyVolumes[ecosystem].hourlyVolume =
              calcHourlyVolume.toString();
            sumHourlyVolume.plus(calcHourlyVolume);
          }
        }
      }

      if (validHourlyVolume) {
        const bigNumberHourlyVol = new BigNumber(hourlyVolume);
        newEcosystemHourlyVolumes[ecosystem].hourlyVolume =
          bigNumberHourlyVol.toString();
        sumHourlyVolume.plus(bigNumberHourlyVol);
      }
    });

    const totalVolume = sumTotalVolume.toString();
    const dailyVolume = sumDailyVolume.toString();
    const hourlyVolume = sumHourlyVolume.toString();

    hourlyDexVolumeDb.put({
      PK: hourlyVolumePk(id),
      SK: `${hourlyTimestamp}`,
      hourlyVolume,
      dailyVolume,
      totalVolume,
      validPrevHour,
    });

    dailyDexVolumeDb.put({
      PK: dailyVolumePk(id),
      SK: `${dailyTimestamp}`,
      dailyVolume,
      totalVolume,
    });

    monthlyDexVolumeDb.put({
      PK: monthlyVolumePk(id),
      SK: `${monthlyTimestamp}`,
      totalVolume,
      ...newEcosystemHourlyVolumes,
    });

    // update hourly daily and monthly

    console.log(newEcosystemHourlyVolumes);

    try {
    } catch (e) {
      console.error(name, e);
      const scope = new Sentry.Scope();
      scope.setTag("protocol", name);
      Sentry.AWSLambda.captureException(e, scope);
      return;
    }

    // store hourly
    // store daily

    // store monthly
  });
};

// export default wrapScheduledLambda(handler);

handler({ protocolIndexes: [0] });
