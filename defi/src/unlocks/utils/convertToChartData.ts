import { ChartData, ChartYAxisData, RawResult } from "../types/adapters";

export function rawToChartData(
  raw: RawResult[],
  start: number,
): ChartYAxisData {
  return raw[0].continuousEnd == null
    ? discreetRawToChart(raw, start)
    : continuousRawToChart(raw, start);
}
function discreetRawToChart(raw: RawResult[], start: number): any {
  const timestamp: number[] = [];
  const unlocked: number[] = [];
  raw.sort((r: RawResult) => r.timestamp);

  if (raw[0].timestamp != start) {
    unlocked.push(0);
    timestamp.push(start);
  }

  let quantity: number = 0;
  raw.map((r: RawResult) => {
    quantity += r.change;
    unlocked.push(quantity);
    timestamp.push(r.timestamp);
  });

  return { timestamp, unlocked, isContinuous: false };
}
function continuousRawToChart(raw: RawResult[], start: number): any {
  const timestamp: number[] = [];
  const unlocked: number[] = [];
  raw.sort((r: RawResult) => r.timestamp);

  if (raw[0].timestamp != start) {
    unlocked.push(0);
    timestamp.push(start);
  }

  let quantity: number = 0;
  raw.map((r: RawResult) => {
    if (r.continuousEnd == null) return;
    unlocked.push(quantity);
    timestamp.push(r.timestamp);
    quantity += r.change;
    unlocked.push(quantity);
    timestamp.push(r.continuousEnd);
  });

  return { timestamp, unlocked, isContinuous: true };
}
