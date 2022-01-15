import { Chain } from "@defillama/sdk/build/general";

export type Ecosystem = Chain | "kava" | "terra";

export type Volumes = {
  dailyVolume: string;
  totalVolume: string;
};

export interface HourlyVolumes extends Volumes {
  hourlyVolume: string;
}

export type MonthlyVolumes = {
  monthlyVolume: string;
  totalVolume: string;
};

export type TimestampBlock = {
  [x: string]: number;
};

export type TimestampVolumes = {
  [x: string]: Volumes;
};

export type DailyEcosystemVolumes = {
  [x: string]: Volumes;
};

export type HourlyEcosystemVolumes = {
  [x: string]: HourlyVolumes;
};

export type MonthlyEcosystemVolumes = {
  [x: string]: MonthlyVolumes;
};

export type ChainBlocks = {
  [x: string]: number;
};

export type AllEcosystemVolumes = {
  [x: string]: {
    volumes: TimestampVolumes;
    startTimestamp: number;
  };
};

export type FetchResult = Volumes & { timestamp: number; block: number };

export type Fetch = (
  timestamp: number,
  chainBlocks: ChainBlocks
) => FetchResult;

export type DailyVolume = string;
export type HourlyVolume = string;
export type TotalVolume = string;
export type Id = number;
export type Unix = number;

export type HourlyVolumesResult = {
  dailyVolume: DailyVolume;
  hourlyVolume: HourlyVolume;
  totalVolume: TotalVolume;
  ecosystems: HourlyEcosystemVolumes;
};

export type HourlyEcosystemRecord = {
  id: Id;
  unix: Unix;
  dailyVolume: DailyVolume;
  hourlyVolume: HourlyVolume;
  totalVolume: TotalVolume;
  ecosystems: HourlyEcosystemVolumes;
};
