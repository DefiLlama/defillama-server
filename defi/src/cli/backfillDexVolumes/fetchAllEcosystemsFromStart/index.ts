import { fetchEcosystemsFromStart } from "../";
import pThrottle from "../../../utils/pThrottle";

import {
  AllEcosystemVolumes,
  Ecosystem,
  EcosystemTimestampBlocks,
  TimestampVolumes,
  VolumeAdapter,
} from "../../../../src/dexVolumes/dexVolume.types";

const fetchAllEcosystemsFromStart = async (
  volumeAdapter: VolumeAdapter,
  end: number,
  ecosystemBlocks?: EcosystemTimestampBlocks,
  throttleFetchCount = 1
): Promise<AllEcosystemVolumes> => {
  const ecosystems: any[] = Object.keys(volumeAdapter);

  const throttle = pThrottle({
    limit: Math.floor(99 / throttleFetchCount),
    interval: 1050,
  });

  return (
    await Promise.all(
      ecosystems.map((ecosystem: Ecosystem) => {
        // TODO add customBackfill
        const { fetch, start } = volumeAdapter[ecosystem];
        const throttleFetch: any = throttle(fetch);
        const blocks = ecosystemBlocks?.[ecosystem];
        return fetchEcosystemsFromStart({
          ecosystem,
          fetch: throttleFetch,
          start,
          end,
          blocks,
        });
      })
    )
  ).reduce(
    (
      acc: {
        [x: string]: { volumes: TimestampVolumes; startTimestamp: number };
      },
      { ecosystem, volumes, startTimestamp }
    ) => {
      acc[ecosystem] = { volumes, startTimestamp };
      return acc;
    },
    {}
  );
};

export default fetchAllEcosystemsFromStart;
