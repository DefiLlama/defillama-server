import { ChartData, ChartYAxisData, RawResult } from "../types/adapters";
import { periodToSeconds } from "./time";

const increment = periodToSeconds.week;

export function rawToChartData(
  raw: RawResult[],
  start: number,
): ChartYAxisData {
  return raw[0].continuousEnd == null
    ? discreetRawToChart(raw, start)
    : continuousRawToChart(raw, start);
}
function discreetRawToChart(raw: RawResult[], start: number): ChartYAxisData {
  const data: number[] = [];
  let workingTimestamp: number = start;
  let workingAmount: number = 0;
  raw.sort((r: RawResult) => r.timestamp);

  for (let i = 0; i < raw.length; i++) {
    while (workingTimestamp < raw[i].timestamp) {
      data.push(workingAmount);
      workingTimestamp += increment;
    }
    const change = Number(raw[i].change);
    data.push(change);
    workingAmount += change;
  }

  return { start, increment, data };
}
function continuousRawToChart(raw: RawResult[], start: number): ChartYAxisData {
  const data: number[] = [];
  let workingTimestamp: number = start;
  let workingAmount: number = 0;
  raw.sort((r: RawResult) => r.timestamp);

  for (let i = 0; i < raw.length; i++) {
    // number of 'inmcrement' in duration
    const dx = ((raw[i].continuousEnd || 0) - raw[i].timestamp) / increment;
    // inflation per 'increment'
    const dy = raw[i].change / dx;

    while (workingTimestamp < (raw[i].continuousEnd || 0)) {
      if (workingTimestamp > raw[i].timestamp) workingAmount += dy;
      data.push(workingAmount);
      workingTimestamp += increment;
    }
  }

  return { start, increment, data };
}
