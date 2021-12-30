import { getCurrentBlocks } from "@defillama/sdk/build/computeTVL/blocks";
import * as Sentry from "@sentry/serverless";

// import { wrapScheduledLambda } from "../utils/shared/wrap";
import { getStartOfHourTimestamp } from "../utils/date";
import dexVolumes from "../protocols/dexVolumes";

export const handler = async (event: any) => {
  const hourUnix = getStartOfHourTimestamp(Date.now() / 1000);
  const { timestamp, chainBlocks } = await getCurrentBlocks();

  event.protocolIndexes.map(async (index: number) => {
    const { id, name, module } = dexVolumes[index];

    const dexVolumeAdapter = await import(
      `../../DefiLlama-Adapters/dexVolumes/${module}`
    );

    const ecosystemFetches = Object.entries(dexVolumeAdapter.volume).map(
      async ([ecosystem, ecosystemFetch]: [string, any]) => {
        let ecosystemFetchResult;

        try {
          ecosystemFetchResult = await ecosystemFetch(timestamp, chainBlocks);
        } catch (e) {
          const errorName = `${name}-${ecosystem}-${timestamp}`;
          console.error(errorName, e);
          const scope = new Sentry.Scope();
          scope.setTag("dex-volume", errorName);
          Sentry.AWSLambda.captureException(e, scope);
          return;
        }

        return { [ecosystem]: ecosystemFetchResult };
      }
    );

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
