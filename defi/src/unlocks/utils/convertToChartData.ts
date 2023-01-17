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
  const xAxis: number[] = [];
  const yAxis: number[] = [];
  raw.sort((r: RawResult) => r.timestamp);

  if (raw[0].timestamp != start) {
    yAxis.push(0);
    xAxis.push(start);
  }

  let quantity: number = 0;
  raw.map((r: RawResult) => {
    quantity += r.change;
    yAxis.push(quantity);
    xAxis.push(r.timestamp);
  });

  return { xAxis, yAxis, isContinuous: false };
}
function continuousRawToChart(raw: RawResult[], start: number): any {
  const xAxis: number[] = [];
  const yAxis: number[] = [];
  raw.sort((r: RawResult) => r.timestamp);

  if (raw[0].timestamp != start) {
    yAxis.push(0);
    xAxis.push(start);
  }

  let quantity: number = 0;
  raw.map((r: RawResult) => {
    if (r.continuousEnd == null) return;
    yAxis.push(quantity);
    xAxis.push(r.timestamp);
    quantity += r.change;
    yAxis.push(quantity);
    xAxis.push(r.continuousEnd);
  });

  return { xAxis, yAxis, isContinuous: true };
}
