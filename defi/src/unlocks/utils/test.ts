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

async function generateChart(adapter: Protocol): Promise<any> {
  return await Promise.all(
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
}
generateChart(tornado); // ts-node utils/test.ts
