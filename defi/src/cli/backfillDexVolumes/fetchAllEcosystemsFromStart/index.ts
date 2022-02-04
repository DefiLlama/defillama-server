import { fetchEcosystemsFromStart } from "../";
import pThrottle from "../../../utils/pThrottle";

const throttle = pThrottle({
  limit: 100,
  interval: 1050,
});

import {
  AllEcosystemVolumes,
  Ecosystem,
  TimestampVolumes,
  VolumeAdapter,
} from "../../../../src/dexVolumes/dexVolume.types";

const fetchAllEcosystemsFromStart = async (
  volumeAdapter: VolumeAdapter,
  end: number
): Promise<AllEcosystemVolumes> => {
  const ecosystems: any[] = Object.keys(volumeAdapter);

  return (
    await Promise.all(
      ecosystems.map((ecosystem: Ecosystem) => {
        // TODO add customBackfill
        const { fetch, start } = volumeAdapter[ecosystem];
        const throttleFetch = throttle(fetch);

        return fetchEcosystemsFromStart({
          ecosystem,
          fetch: throttleFetch,
          start,
          end,
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
