import * as dexAdapters from "../../../../DefiLlama-Adapters/dexVolumes";

import { fetchEcosystemsFromStart } from "../";

import { getDexVolumeRecord } from "../../../dexVolumes/dexVolumeRecords";

import {
  AllEcosystemVolumes,
  Ecosystem,
  TimestampVolumes,
  VolumeAdapter,
} from "../../../../src/dexVolumes/dexVolume.types";

const fetchAllEcosystemsFromStart = async (
  volume: VolumeAdapter,
  end: number
): Promise<AllEcosystemVolumes> => {
  const ecosystems: any[] = Object.keys(volume);

  return (
    await Promise.all(
      ecosystems.map((ecosystem: Ecosystem) => {
        // TODO add customBackfill
        const { fetch, start } = volume[ecosystem];
        return fetchEcosystemsFromStart({ ecosystem, fetch, start, end });
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
