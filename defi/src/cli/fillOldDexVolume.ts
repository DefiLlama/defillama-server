import BigNumber from "bignumber.js";

import {
  dailyDexVolumeDb,
  getDexVolumeRecord,
  putHourlyDexVolumeRecord,
} from "../dexVolumes/dexVolumeRecords";
import { PUT_DAILY_VOLUME_ERROR, reportDexVolumeError } from "../utils/error";
import {
  calcIsNewDay,
  getTimestampAtStartOfHour,
  getTimestampAtStartOfDayUTC,
} from "../utils/date";
import { getChainBlocksRetry } from "./utils";

import {
  AllEcosystemVolumes,
  ChainBlocks,
  DailyEcosystemVolumes,
  Ecosystem,
  FetchResult,
  HourlyEcosystemVolumes,
  HourlyVolumes,
  TimestampBlock,
  TimestampVolumes,
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

const fetchAllEcosystemsFromStart = async (
  id: number
): Promise<AllEcosystemVolumes> => {
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

const calcDailyVolume = (
  currDayTotalVolume: string,
  nextDayTotalVolume: string
) => ({
  totalVolume: nextDayTotalVolume,
  dailyVolume: new BigNumber(nextDayTotalVolume)
    .minus(new BigNumber(currDayTotalVolume))
    .toString(),
});

const calcHourlyVolume = ({
  ecosystems,
  timestamp,
  allEcosystemVolumes,
}: {
  ecosystems: string[];
  timestamp: number;
  allEcosystemVolumes: AllEcosystemVolumes;
}) => {
  const prevTimestamp = timestamp - HOUR;
  const startDayofPrev = getTimestampAtStartOfDayUTC(prevTimestamp);

  const dailySumVolume = new BigNumber(0);
  const hourlySumVolume = new BigNumber(0);
  const totalSumVolume = new BigNumber(0);
  const hourlyEcosystemVolumes: HourlyEcosystemVolumes = {};

  ecosystems.forEach((ecosystem) => {
    const { volumes } = allEcosystemVolumes[ecosystem];

    const { totalVolume: currTotalVolume } = volumes[timestamp];
    const { totalVolume: prevTotalVolume } = volumes[prevTimestamp];

    const { totalVolume: prevDayTotalVolume } = volumes[startDayofPrev];

    // Calc values given totalVolume
    if (currTotalVolume && prevTotalVolume && prevDayTotalVolume) {
      const bigNumCurrTotalVol = new BigNumber(currTotalVolume);
      const bigNumPrevTotalVol = new BigNumber(prevTotalVolume);
      const bigNumPrevDayTotalVol = new BigNumber(prevDayTotalVolume);

      const bigNumDailyVolume = bigNumCurrTotalVol.minus(bigNumPrevDayTotalVol);
      const bigNumHourlyVolume = bigNumCurrTotalVol.minus(bigNumPrevTotalVol);

      dailySumVolume.plus(bigNumDailyVolume);
      hourlySumVolume.plus(bigNumHourlyVolume);
      totalSumVolume.plus(bigNumCurrTotalVol);

      hourlyEcosystemVolumes[ecosystem] = {
        dailyVolume: bigNumDailyVolume.toString(),
        hourlyVolume: bigNumHourlyVolume.toString(),
        totalVolume: currTotalVolume,
      };
    }
  });

  return {
    dailyVolume: dailySumVolume.toString(),
    hourlyVolume: hourlySumVolume.toString(),
    totalVolume: totalSumVolume.toString(),
    ecosystems: hourlyEcosystemVolumes,
  };
};

const fillOldDexVolume = async (id: number) => {
  const allEcosystemVolumes = await fetchAllEcosystemsFromStart(id);
  const ecosystems = Object.keys(allEcosystemVolumes);
  const currentTimestamp = getTimestampAtStartOfHour(Date.now() / 1000);

  const earliestTimestamp = ecosystems.reduce(
    (acc, curr) =>
      acc > allEcosystemVolumes[curr].startTimestamp
        ? allEcosystemVolumes[curr].startTimestamp
        : acc,
    Number.MAX_SAFE_INTEGER
  );

  // Calculate every day daily until today
  // for (
  //   let timestamp = earliestTimestamp;
  //   timestamp < currentTimestamp;
  //   timestamp += DAY
  // ) {
  //   const totalSumVolume = new BigNumber(0);
  //   const dailySumVolume = new BigNumber(0);
  //   const dailyEcosystemVolumes: DailyEcosystemVolumes = {};

  //   const allDbWrites = [];

  //   ecosystems.forEach((ecosystem) => {
  //     const { volumes } = allEcosystemVolumes[ecosystem];
  //     const currDayTotalVolume = volumes[timestamp]?.totalVolume;
  //     const nextDayTotalVolume = volumes[timestamp + DAY]?.totalVolume;
  //     if (
  //       currDayTotalVolume !== undefined &&
  //       nextDayTotalVolume !== undefined
  //     ) {
  //       const { dailyVolume, totalVolume } = calcDailyVolume(
  //         currDayTotalVolume,
  //         nextDayTotalVolume
  //       );

  //       dailySumVolume.plus(new BigNumber(dailyVolume));
  //       totalSumVolume.plus(new BigNumber(totalVolume));

  //       dailyEcosystemVolumes[ecosystem] = {
  //         dailyVolume,
  //         totalVolume,
  //       };
  //     }
  //   });

  //   allDbWrites.push(
  //     dailyDexVolumeDb.put({
  //       id,
  //       unix: timestamp,
  //       dailyVolume: dailySumVolume.toString(),
  //       totalVolume: totalSumVolume.toString(),
  //       ecosystems: dailyEcosystemVolumes,
  //     })
  //   );
  // }

  for (let i = 0; i < 24; i++) {
    const timestamp = currentTimestamp - HOUR * i;

    putHourlyDexVolumeRecord();
  }

  // TODO calc hourly volume

  // TODO calc monthly volume

  // TODO unlock dex-volume at end to allow hourly CRON
};

// TODO fill multiple protocols
// TODO fill All protocols
