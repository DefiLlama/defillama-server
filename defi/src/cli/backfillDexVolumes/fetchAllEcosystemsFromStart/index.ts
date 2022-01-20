import * as dexAdapters from "../../../../DefiLlama-Adapters/dexVolumes";

import { fetchEcosystemsFromStart } from "../";

import { getDexVolumeRecord } from "../../../dexVolumes/dexVolumeRecords";

import {
  AllEcosystemVolumes,
  Ecosystem,
  TimestampVolumes,
} from "../../../../src/dexVolumes/dexVolume.types";

const fetchAllEcosystemsFromStart = async (
  id: number,
  end: number
): Promise<AllEcosystemVolumes> => {
  const {
    module: dexModule,
  }: {
    name: string;
    module: keyof typeof dexAdapters;
  } = await getDexVolumeRecord(id);

  // TODO handle breakdown
  const { volume, breakdown }: any = dexAdapters[dexModule];

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
