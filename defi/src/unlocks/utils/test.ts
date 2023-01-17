import { tornado } from "./../protocols/tornado";
import {
  AdapterResult,
  StepAdapterResult,
  CliffAdapterResult,
  LinearAdapterResult,
  RawResult,
  ChartYAxisData,
  ChartData,
  Protocol,
} from "../types/adapters";
import { rawToChartData } from "./convertToChartData";
import {
  stepAdapterToRaw,
  cliffAdapterToRaw,
  linearAdapterToRaw,
} from "./convertToRawData";
import * as echarts from "echarts";

export async function parseData(adapter: Protocol): Promise<any> {
  let a = await Promise.all(
    Object.entries(adapter).map(async (a: any[]) => {
      const section = a[0];
      let adapterResults = await a[1];
      if (adapterResults.length == null) adapterResults = [adapterResults];

      const rawResults = adapterResults.flat().map((r: AdapterResult) => {
        switch (r.type) {
          case "step":
            return stepAdapterToRaw(<StepAdapterResult>r);
          case "cliff":
            return cliffAdapterToRaw(<CliffAdapterResult>r);
          case "linear":
            return linearAdapterToRaw(<LinearAdapterResult>r);
          default:
            throw new Error(`invalid adapter type: ${r.type}`);
        }
      });
      const bigUnixTime: number = 10_000_000_000;
      const startTime: number = Math.min(
        ...adapterResults.map((r: AdapterResult) =>
          r.start == null ? bigUnixTime : r.start,
        ),
      );

      const data = rawResults.map((r: RawResult[]) =>
        rawToChartData(r, startTime),
      );

      const xAxis: number[] = Array.from(
        Array(
          Number(Math.max(...data.map((d: ChartYAxisData) => d.data.length))),
        ).keys(),
      ).map((i: number) => startTime + i * data[0].increment);

      return { data, xAxis, section };
    }),
  );
  return a;
}
async function drawChart(data: any): Promise<any> {
  data;
  const series = [];
  const chartDom = document.getElementById("main");
  if (chartDom == null) return;
  const myChart = echarts.init(chartDom);
  const option = {
    title: "Hi",
    legend: [],
    toolbox: { feature: { saveAsImage: {} } },
    grid: [],
    xAxis: {
      type: "value",
      data: [],
    },
    yAxis: {
      type: "value",
    },
    series: [
      {
        name: "",
        type: "line",
        stack: "Total",
        areaStyle: {},
        emphasis: { focus: "series" },
        data: [],
      },
    ],
  };
  option && myChart.setOption(option);
  console.log(
    myChart.getDataURL({
      pixelRatio: 2,
      backgroundColor: "#fff",
    }),
  );
  return;
}
async function generateChart(adapter: Protocol): Promise<any> {
  const data = await parseData(adapter);
  await drawChart(data);
}
export async function main() {
  await generateChart(tornado); // ts-node utils/test.ts
}
