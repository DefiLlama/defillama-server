import {
  getChainBlocks,
  chainsForBlocks,
} from "@defillama/sdk/build/computeTVL/blocks";
import * as Sentry from "@sentry/serverless";

// import { wrapScheduledLambda } from "../utils/shared/wrap";
import {
  getTimestampAtStartOfHour,
  getTimestampAtStartOfDay,
} from "../utils/date";
import { hourlyDexVolumeDb } from "../utils/shared/dynamodb";
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
          return;
        }

        return { [ecosystem]: ecosystemFetchResult };
      }
    );

    let lastUpdatedData;

    // if start of new day, compare to yesterday's daily, if not compare to todays
    if (hourlyTimestamp === dailyTimestamp) {
      // how to query dynamo
    } else {
      lastUpdatedData = hourlyDexVolumeDb.query({});
    }

    const protocolVolumes = (await Promise.all(ecosystemFetches)).reduce(
      (acc, volume) => ({ ...acc, ...volume }),
      {}
    );

    console.log(protocolVolumes, "protocolVolumes");

    // assuming there is prev hour

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
