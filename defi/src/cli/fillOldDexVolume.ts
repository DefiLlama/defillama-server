import BigNumber from "bignumber.js";

import {
  getDexVolumeRecord,
  dailyDexVolumeDb,
} from "../dexVolumes/dexVolumeRecords";
import { reportDexVolumeError, PUT_DAILY_VOLUME_ERROR } from "../utils/error";
import { getTimestampAtStartOfHour } from "../utils/date";
import { getChainBlocksRetry } from "./utils";

import {
  TimestampBlock,
  TimestampVolumes,
  EcosystemVolumes,
  ChainBlocks,
  FetchResult,
  Ecosystem,
} from "../../src/dexVolumes/dexVolume.types";

import * as dexAdapters from "../../DefiLlama-Adapters/dexVolumes";

const HOUR = 3600;
const DAY = HOUR * 24;

type Fetch = (timestamp: number, chainBlocks: ChainBlocks) => FetchResult;

const getBlocksFromStart = async (start: number, ecosystem: Ecosystem) => {
  const currentTimestamp = getTimestampAtStartOfHour(Date.now() / 1000);

  const blocks = [];
  // TODO optimize by storing all blocks in db for one query

  // Get everyday up to today
  for (let timestamp = start; timestamp <= currentTimestamp; timestamp += DAY) {
    blocks.push(getChainBlocksRetry(timestamp, ecosystem));
  }

  // Get last 25 hours
  for (let i = 0; i < 25; i++) {
    blocks.push(getChainBlocksRetry(currentTimestamp - HOUR * i, ecosystem));
  }

  // TODO add error report
  const allBlocksRes = await Promise.all(blocks);

  return allBlocksRes.reduce((acc: TimestampBlock, curr) => {
    acc[curr.inputTimestamp] = curr.block;
    return acc;
  }, {});
};

const getVolumesFromStart = async ({
  blocks,
  ecosystem,
  fetch,
  start,
}: {
  blocks: TimestampBlock;
  ecosystem: Ecosystem;
  fetch: Fetch;
  start: number;
}) => {
  const currentTimestamp = getTimestampAtStartOfHour(Date.now() / 1000);

  const volumes = [];

  // Get everyday up to today
  for (let timestamp = start; timestamp <= currentTimestamp; timestamp += DAY) {
    const chainBlocks = { [ecosystem]: blocks[timestamp] };
    volumes.push(fetch(timestamp, chainBlocks));
  }

  // Get last 25 hours
  for (let i = 0; i < 25; i++) {
    const timestamp = currentTimestamp - HOUR * i;
    const chainBlocks = { [ecosystem]: blocks[timestamp] };
    volumes.push(fetch(timestamp, chainBlocks));
  }

  // TODO add error report
  const allVolumeRes = await Promise.all(volumes);

  return allVolumeRes.reduce((acc: TimestampVolumes, curr: FetchResult) => {
    const { dailyVolume, timestamp, totalVolume } = curr;
    acc[timestamp] = {
      totalVolume,
      dailyVolume,
    };
    return acc;
  }, {});
};

const fetchEcosystemsFromStart = async ({
  ecosystem,
  fetch,
  start,
}: {
  ecosystem: Ecosystem;
  fetch: Fetch;
  start: number | any;
}) => {
  const startTimestamp = typeof start === "number" ? start : await start();

  // TODO add error report
  const blocks = await getBlocksFromStart(startTimestamp, ecosystem);
  const volumes = await getVolumesFromStart({
    blocks,
    ecosystem,
    fetch,
    start: startTimestamp,
  });
  return {
    ecosystem,
    volumes,
    startTimestamp,
  };
};

const fetchAllEcosystemsFromStart = async (id: number) => {
  const {
    name,
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
        return fetchEcosystemsFromStart({ ecosystem, fetch, start });
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
