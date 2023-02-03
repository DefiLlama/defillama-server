import { ChartData, ChartConfig, RawResult } from "../types/adapters";
import { periodToSeconds } from "./time";

export function rawToChartData(
  raw: RawResult[],
  start: number,
  end: number,
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
    unlocked.push(workingQuantity);
    timestamps.push(workingTimestamp);
    workingTimestamp += resolution;
  }
  return { timestamps, unlocked, isContinuous: true };
}
function discreet(raw: RawResult[], config: ChartConfig): ChartData {
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
