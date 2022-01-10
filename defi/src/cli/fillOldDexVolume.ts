import { getDexVolumeRecord } from "../utils/dexVolumeRecords";
import { getTimestampAtStartOfHour } from "../utils/date";
import { getChainBlocksRetry, Ecosystem } from "./utils";

import * as dexAdapters from "../../DefiLlama-Adapters/dexVolumes";

const HOUR = 3600;

const getAllBlocksFromStart = async (start: number, ecosystem: Ecosystem) => {
  const currentTimestamp = getTimestampAtStartOfHour(Date.now() / 1000);

  const blocks = [];

  for (
    let timestamp = start;
    timestamp <= currentTimestamp;
    timestamp += HOUR
  ) {
    blocks.push(getChainBlocksRetry(timestamp, ecosystem));
  }

  const allBlocksRes = await Promise.all(blocks);

  return allBlocksRes.reduce((acc: { [x: string]: number }, curr) => {
    acc[curr.inputTimestamp] = curr.block;
    return acc;
  }, {});
};

const fetchAllFromStart = async ({
  fetch,
  start,
  allFetches,
  ecosystemFetchIndex,
  ecosystem,
}: {
  fetch: any;
  start: number | any;
  allFetches: any;
  ecosystemFetchIndex: any;
  ecosystem: Ecosystem;
}) => {
  const startTimestamp = typeof start === "number" ? start : await start();
  const currentTimestamp = getTimestampAtStartOfHour(Date.now() / 1000);

  const blocks = getAllBlocksFromStart(startTimestamp, ecosystem);

  for (
    let timestamp = startTimestamp;
    timestamp <= currentTimestamp;
    timestamp += HOUR
  ) {}
};

const fillProtocolDexVolume = async (protocolId: number) => {
  const {
    id,
    name,
    module: dexModule,
  }: {
    id: number;
    name: string;
    module: keyof typeof dexAdapters;
  } = await getDexVolumeRecord(protocolId);

  const { volume }: any = dexAdapters[dexModule];

  const ecosystems = Object.keys(volume);

  const ecosystemFetchIndex = {};

  const allFetches = [];

  ecosystems.forEach((ecosystem) => {
    // TODO add customBackfill
    const { fetch, start } = volume[ecosystem];
  });

  const allDates = {};
};

// TODO fill multiple protocols
// TODO fill All protocols
