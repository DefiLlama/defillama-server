import * as dexAdapters from "../../../DefiLlama-Adapters/dexVolumes";
import { DynamoDB, AWSError } from "aws-sdk";
import { PromiseResult } from "aws-sdk/lib/request";

import {
  getDexVolumeRecord,
  putDailyDexVolumeRecord,
  putHourlyDexVolumeRecord,
  putMonthlyDexVolumeRecord,
  updateLockDexVolumeRecord,
} from "../../dexVolumes/dexVolumeRecords";

import { getTimestampAtStartOfHour } from "../../utils/date";

export { default as calcDailyVolume } from "./calcDailyVolume";
export { default as calcHourlyVolume } from "./calcHourlyVolume";
export { default as calcMonthlyVolume } from "./calcMonthlyVolume";
export { default as fetchAllEcosystemsFromStart } from "./fetchAllEcosystemsFromStart";
export { default as fetchEcosystemsFromStart } from "./fetchEcosystemsFromStart";
export { default as getBlocksFromStart } from "./getBlocksFromStart";
export { default as getVolumesFromStart } from "./getVolumesFromStart";

import calcAllVolumes from "./calcAllVolumes";
import calcAllDailyBreakdownVolume from "./calcAllDailyBreakdownVolume";
import calcAllHourlyBreakdownVolume from "./calcAllHourlyBreakdownVolume";
import calcAllMonthlyBreakdownVolume from "./calcAllMonthlyBreakdownVolume";

import {
  DailyEcosystemRecord,
  HourlyEcosystemRecord,
  MonthlyEcosystemRecord,
  VolumeAdapter,
} from "../../../src/dexVolumes/dexVolume.types";

export const MAX_HOURS = 25;

/*
  WARNING: Will replace all monthly,daily, last 24 hours records

  Edge cases:
   - Do not run before the hour and cron job, might miss the current hour CRON job
   - If volume adapter depends on subgraph, do not run exactly on the hour as the chain block may not be ready yet
*/

const backfillDexVolumes = async (id: number) => {
  const currentTimestamp = getTimestampAtStartOfHour(Date.now() / 1000);

  const {
    module: dexModule,
    locked,
  }: {
    name: string;
    module: keyof typeof dexAdapters;
    locked: boolean;
  } = await getDexVolumeRecord(id);

  if (!locked) {
    await updateLockDexVolumeRecord(id, true);
  }

  const {
    volume: volumeAdapter,
    breakdown: breakdownAdapter,
  }: // TODO replace with stricter type later
  { volume?: any; breakdown?: { [x: string]: VolumeAdapter } } =
    dexAdapters[dexModule];

  const allDbWrites: Promise<
    PromiseResult<DynamoDB.DocumentClient.PutItemOutput, AWSError>
  >[] = [];

  if (volumeAdapter) {
    const { dailyVolumes, hourlyVolumes, monthlyVolumes } =
      await calcAllVolumes({
        currentTimestamp,
        id,
        volumeAdapter,
      });

    Object.values(dailyVolumes).forEach(
      (dailyEcosystemRecord: DailyEcosystemRecord) => {
        allDbWrites.push(putDailyDexVolumeRecord(dailyEcosystemRecord));
      }
    );

    Object.values(hourlyVolumes).forEach(
      (hourlyEcosystemRecord: HourlyEcosystemRecord) => {
        allDbWrites.push(putHourlyDexVolumeRecord(hourlyEcosystemRecord));
      }
    );

    Object.values(monthlyVolumes).forEach(
      (monthlyEcosystemRecord: MonthlyEcosystemRecord) => {
        allDbWrites.push(putMonthlyDexVolumeRecord(monthlyEcosystemRecord));
      }
    );
  } else if (breakdownAdapter) {
    const breakdownDailyVolumes: {
      dailyVolumes: { [x: string]: DailyEcosystemRecord };
      earliestTimestamp: number;
      breakdown: string;
    }[] = [];

    const breakdownHourlyVolumes: {
      hourlyVolumes: { [x: string]: HourlyEcosystemRecord };
      earliestTimestamp: number;
      breakdown: string;
    }[] = [];

    const breakdownMonthlyVolumes: {
      monthlyVolumes: { [x: string]: MonthlyEcosystemRecord };
      earliestTimestamp: number;
      breakdown: string;
    }[] = [];

    await Promise.all(
      Object.entries(breakdownAdapter).map(
        async ([breakdown, volumeAdapter]) => {
          const { dailyVolumes, hourlyVolumes, monthlyVolumes } =
            await calcAllVolumes({ currentTimestamp, id, volumeAdapter });

          breakdownDailyVolumes.push({
            dailyVolumes,
            earliestTimestamp: currentTimestamp,
            breakdown,
          });

          breakdownHourlyVolumes.push({
            hourlyVolumes,
            earliestTimestamp: currentTimestamp,
            breakdown,
          });

          breakdownMonthlyVolumes.push({
            monthlyVolumes,
            earliestTimestamp: currentTimestamp,
            breakdown,
          });
        }
      )
    );

    Object.values(
      calcAllDailyBreakdownVolume({
        breakdownDailyVolumes,
        currentTimestamp,
        id,
      })
    ).forEach((dailyEcosystemRecord: DailyEcosystemRecord) => {
      allDbWrites.push(putDailyDexVolumeRecord(dailyEcosystemRecord));
    });

    Object.values(
      calcAllHourlyBreakdownVolume({
        breakdownHourlyVolumes,
        currentTimestamp,
        id,
      })
    ).forEach((dailyEcosystemRecord: DailyEcosystemRecord) => {
      allDbWrites.push(putDailyDexVolumeRecord(dailyEcosystemRecord));
    });

    Object.values(
      calcAllMonthlyBreakdownVolume({
        breakdownMonthlyVolumes,
        currentTimestamp,
        id,
      })
    ).forEach((dailyEcosystemRecord: DailyEcosystemRecord) => {
      allDbWrites.push(putDailyDexVolumeRecord(dailyEcosystemRecord));
    });
  }

  await Promise.all(allDbWrites);

  await updateLockDexVolumeRecord(id, false);
  console.log("done");

  // TODO unlock dex-volume at end to allow hourly CRON
};

// backfillDexVolumes(468).catch((e) => {
//   console.log(e);
// });

// TODO fill multiple protocols
// TODO fill All protocols
