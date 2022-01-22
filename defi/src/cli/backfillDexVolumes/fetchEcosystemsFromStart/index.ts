import { Ecosystem, Fetch } from "../../../../src/dexVolumes/dexVolume.types";

import { getBlocksFromStart, getVolumesFromStart } from "../";

const fetchEcosystemsFromStart = async ({
  ecosystem,
  fetch,
  start,
  end,
}: {
  ecosystem: Ecosystem;
  fetch: Fetch;
  start: number | any;
  end: number;
}) => {
  const startTimestamp = typeof start === "number" ? start : await start();

  const blocks = await getBlocksFromStart(startTimestamp, ecosystem, end);
  const { allVolumes, startTimestamp: updatedStartTimestamp } =
    await getVolumesFromStart({
      blocks,
      ecosystem,
      fetch,
      start: startTimestamp,
      end,
    });

  return {
    ecosystem,
    volumes: allVolumes,
    startTimestamp: updatedStartTimestamp,
  };
};

export default fetchEcosystemsFromStart;
