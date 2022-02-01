import * as dexAdapters from "../../../DefiLlama-Adapters/dexVolumes";

import {
  getDexVolumeRecord,
  putDailyDexVolumeRecord,
  putHourlyDexVolumeRecord,
  putMonthlyDexVolumeRecord,
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

import {
  DailyEcosystemRecord,
  HourlyEcosystemRecord,
  MonthlyEcosystemRecord,
} from "../../../src/dexVolumes/dexVolume.types";

export const MAX_HOURS = 25;

const backfillDexVolumes = async (id: number) => {
  const currentTimestamp = getTimestampAtStartOfHour(Date.now() / 1000);

  const {
    module: dexModule,
  }: {
    name: string;
    module: keyof typeof dexAdapters;
  } = await getDexVolumeRecord(id);

  const { volume: volumeAdapter, breakdown }: any = dexAdapters[dexModule];

  const allDbWrites = [];

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
  }

  // TODO unlock dex-volume at end to allow hourly CRON
};

// backfillDexVolumes(468);

// TODO fill multiple protocols
// TODO fill All protocols
