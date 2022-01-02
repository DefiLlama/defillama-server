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
} from "../utils/date";
import {
  dailyDexVolumeDb,
  hourlyDexVolumeDb,
  monthlyDexVolumeDb,
  getHourlyDexVolumeRecord,
  hourlyVolume,
} from "../utils/dexVolumeRecords";
import dexVolumes from "../protocols/dexVolumes";

export const handler = async (event: any) => {
  const currentTimestamp = Date.now() / 1000;
  const hourlyTimestamp = getTimestampAtStartOfHour(currentTimestamp);
  const prevHourlyTimestamp = hourlyTimestamp - 3600;
  const dailyTimestamp = getTimestampAtStartOfDay(currentTimestamp);
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
          const errorName = `${name}-${ecosystem}-${hourlyTimestamp}`;
          console.error(errorName, e);
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

    let lastUpdatedData = await getHourlyDexVolumeRecord(
      hourlyVolume(id),
      `${prevHourlyTimestamp}`
    );

    // Marks this hourly's volume as inaccurate
    let invalidPrevHour = !!lastUpdatedData;

    const summedHourlyVolumes: {
      totalVolume: BigNumber;
      dailyVolume: BigNumber;
      hourlyVolume: BigNumber;
    } = {
      totalVolume: new BigNumber(0),
      dailyVolume: new BigNumber(0),
      hourlyVolume: new BigNumber(0),
    };

    const newEcosystemHourlyVolumes: {
      [x: string]: {
        [y: string]: BigNumber;
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
        newEcosystemHourlyVolumes[ecosystem].totalVolume = bigNumberTotalVol;
        summedHourlyVolumes.totalVolume =
          summedHourlyVolumes.totalVolume.plus(bigNumberTotalVol);

        if (!validDailyVolume) {
          let calcDailyVolume = bigNumberTotalVol.minus(
            new BigNumber(lastUpdatedData?.totalVolume || 0)
          );
          newEcosystemHourlyVolumes[ecosystem].dailyVolume = calcDailyVolume;
          summedHourlyVolumes.dailyVolume =
            summedHourlyVolumes.dailyVolume.plus(calcDailyVolume);
        }

        if (!validHourlyVolume) {
          let calcHourlyVolume = bigNumberTotalVol.minus(
            new BigNumber(lastUpdatedData?.totalVolume || 0)
          );
          newEcosystemHourlyVolumes[ecosystem].hourlyVolume = calcHourlyVolume;
          summedHourlyVolumes.hourlyVolume.plus(calcHourlyVolume);
        }
      }

      // Calc daily, if no hourly and total, calc hourly
      if (validDailyVolume) {
        const bigNumberDailyVol = new BigNumber(dailyVolume);
        newEcosystemHourlyVolumes[ecosystem].dailyVolume = bigNumberDailyVol;
        summedHourlyVolumes.dailyVolume = bigNumberDailyVol;

        if (!validHourlyVolume && !validTotalVolume) {
          if (hourlyTimestamp === dailyTimestamp) {
            newEcosystemHourlyVolumes[ecosystem].hourlyVolume =
              bigNumberDailyVol;
            summedHourlyVolumes.hourlyVolume.plus(bigNumberDailyVol);
          } else {
            let calcHourlyVolume = bigNumberDailyVol.minus(
              new BigNumber(lastUpdatedData?.dailyVolume || 0)
            );
            newEcosystemHourlyVolumes[ecosystem].hourlyVolume =
              calcHourlyVolume;
            summedHourlyVolumes.hourlyVolume.plus(calcHourlyVolume);
          }
        }
      }

      if (validHourlyVolume) {
        const bigNumberHourlyVol = new BigNumber(hourlyVolume);
        newEcosystemHourlyVolumes[ecosystem].hourlyVolume = bigNumberHourlyVol;
        summedHourlyVolumes.hourlyVolume.plus(bigNumberHourlyVol);
      }
    });

    console.log(summedHourlyVolumes, newEcosystemHourlyVolumes);

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
