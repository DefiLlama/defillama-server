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

export async function parseData(adapter: Protocol): Promise<any> {
  let xAxis: number[] = [];

  const yAxis = await Promise.all(
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

      data.map((d: any) => {
        xAxis = [...new Set([...d.xAxis, ...xAxis])];
      });
      return { data, section };
    }),
  );

  return { xAxis, yAxis };
}

export async function main() {
  const data = await parseData(tornado); // ts-node defi/src/unlocks/utils/test.ts
}
main();
