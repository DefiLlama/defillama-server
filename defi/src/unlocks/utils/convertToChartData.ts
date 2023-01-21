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
  const steps = (roundedEnd - roundedStart) / resolution;
  const timestamps: number[] = [];
  const unlocked: number[] = [];
  raw.sort((r: RawResult) => r.timestamp);

  let workingQuantity: number = 0;
  let workingTimestamp: number = roundedStart;
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

  return { timestamps, unlocked, isContinuous: raw[0].continuousEnd != null };
}
