import {
  Ecosystem,
  Fetch,
  TimestampBlocks,
} from "../../../../src/dexVolumes/dexVolume.types";

import { getBlocksFromStart, getVolumesFromStart } from "../";

const fetchEcosystemsFromStart = async ({
  ecosystem,
  fetch,
  start,
  end,
  blocks,
}: {
  ecosystem: Ecosystem;
  fetch: Fetch;
  start: number | any;
  end: number;
  blocks?: TimestampBlocks;
}) => {
  const startTimestamp = typeof start === "number" ? start : await start();

  const endBlocks =
    blocks ?? (await getBlocksFromStart(startTimestamp, ecosystem, end));

  console.log(`Successfully fetched all ${ecosystem} blocks`);

  const { allVolumes, startTimestamp: updatedStartTimestamp } =
    await getVolumesFromStart({
      blocks: endBlocks,
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
