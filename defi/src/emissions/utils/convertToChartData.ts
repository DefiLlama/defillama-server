import { periodToSeconds } from "./time";
import {
  ChartData,
  ChartConfig,
  RawResult,
  RawSection,
  ChartSection,
} from "../types/adapters";

export function createChartData(
  rawSections: RawSection[],
  startTime: number,
  endTime: number,
  isTest: boolean = true,
): ChartSection[] {
  const data: any[] = [];
  rawSections.map((r: any) => {
    r.results.map((d: any) =>
      data.push({
        data: rawToChartData(d, startTime, endTime, isTest),
        section: r.section,
      }),
    );
  });

  return consolidateDuplicateKeys(data);
}
function consolidateDuplicateKeys(data: any[]) {
  let sortedData: any[] = [];

  data.map((d: any) => {
    const sortedKeys = sortedData.map((s: any) => s.section);

    if (sortedKeys.includes(d.section)) {
      d.data.apiData.map((a: any, i: number) => {
        const j = sortedKeys.indexOf(d.section);
        sortedData[j].data.apiData[i].unlocked += a.unlocked;
      });
    }

    sortedData.push(d);
  });

  return sortedData;
}
export function rawToChartData(
  raw: RawResult[],
  start: number,
  end: number,
  isTest: boolean = true,
  resolution: number = periodToSeconds.day,
): ChartData {
  const roundedStart: number = Math.floor(start / resolution) * resolution;
  const roundedEnd: number = Math.ceil(end / resolution) * resolution;
  let config: ChartConfig = {
    resolution,
    roundedStart,
    roundedEnd,
    steps: (roundedEnd - roundedStart) / resolution,
    timestamps: [],
    unlocked: [],
    workingQuantity: 0,
    workingTimestamp: roundedStart,
    isTest,
    apiData: [],
  };
  raw.sort((r: RawResult) => r.timestamp);

  return raw[0].continuousEnd ? continuous(raw, config) : discreet(raw, config);
}
function continuous(raw: RawResult[], config: ChartConfig): ChartData {
  let {
    resolution,
    steps,
    timestamps,
    unlocked,
    workingQuantity,
    workingTimestamp,
    isTest,
    apiData,
  } = config;

  if (raw[0].continuousEnd == null)
    throw new Error(
      `some noncontinuous data has entered the continuous function`,
    );

  const dy: number =
    (raw[0].change * resolution) / (raw[0].continuousEnd - raw[0].timestamp);

  for (let i = 0; i < steps; i++) {
    if (
      raw[0].timestamp < workingTimestamp &&
      raw[0].continuousEnd > workingTimestamp
    ) {
      workingQuantity += dy;
    }
    if (isTest) {
      unlocked.push(workingQuantity);
      timestamps.push(workingTimestamp);
    } else {
      apiData.push({ timestamp: workingTimestamp, unlocked: workingQuantity });
    }
    workingTimestamp += resolution;
  }
  return { timestamps, unlocked, apiData, isContinuous: true };
}
function discreet(raw: RawResult[], config: ChartConfig): ChartData {
  let {
    resolution,
    steps,
    timestamps,
    unlocked,
    workingQuantity,
    workingTimestamp,
    isTest,
    apiData,
  } = config;

  let j = 0; // index of current raw data timestamp
  for (let i = 0; i < steps; i++) {
    // checks if the next data point falls between the previous and next plot times
    if (j < raw.length && raw[j].timestamp < workingTimestamp) {
      workingQuantity += raw[j].change;
      j += 1;
    }
    if (isTest) {
      unlocked.push(workingQuantity);
      timestamps.push(workingTimestamp);
    } else {
      apiData.push({ timestamp: workingTimestamp, unlocked: workingQuantity });
    }
    workingTimestamp += resolution;
  }
  return { timestamps, unlocked, apiData, isContinuous: false };
}
