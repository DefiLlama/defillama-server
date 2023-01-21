import { ChartData, ChartYAxisData, RawResult } from "../types/adapters";
import { periodToSeconds } from "./time";

export function rawToChartData(
  raw: RawResult[],
  start: number,
  end: number,
  resolution: number = periodToSeconds.day,
): any {
  const roundedStart = Math.floor(start / resolution) * resolution;
  const roundedEnd = Math.ceil(end / resolution) * resolution;
  let config = {
    resolution,
    roundedStart,
    roundedEnd,
    steps: (roundedEnd - roundedStart) / resolution,
    timestamps: [],
    unlocked: [],
    workingQuantity: 0,
    workingTimestamp: roundedStart,
  };
  raw.sort((r: RawResult) => r.timestamp);

  return raw[0].continuousEnd ? continuous(raw, config) : discreet(raw, config);
}
function continuous(raw: any, config: any) {
  let {
    resolution,
    steps,
    timestamps,
    unlocked,
    workingQuantity,
    workingTimestamp,
  } = config;

  const dy =
    (raw[0].change * resolution) / (raw[0].continuousEnd - raw[0].timestamp);

  for (let i = 0; i < steps; i++) {
    if (raw[0].timestamp < workingTimestamp) {
      workingQuantity += dy;
    }
    unlocked.push(workingQuantity);
    timestamps.push(workingTimestamp);
    workingTimestamp += resolution;
  }
  return { timestamps, unlocked, isContinuous: true };
}
function discreet(raw: any, config: any) {
  let {
    resolution,
    steps,
    timestamps,
    unlocked,
    workingQuantity,
    workingTimestamp,
  } = config;

  let j = 0; // index of current raw data timestamp
  for (let i = 0; i < steps; i++) {
    // checks if the next data point falls between the previous and next plot times
    if (j < raw.length && raw[j].timestamp < workingTimestamp) {
      workingQuantity += raw[j].change;
      j += 1;
    }
    unlocked.push(workingQuantity);
    timestamps.push(workingTimestamp);
    workingTimestamp += resolution;
  }
  return { timestamps, unlocked, isContinuous: false };
}
