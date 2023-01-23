import { curve as adapter } from "./../protocols/curve";
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
import { getChartPng } from "./chart";

export async function parseData(adapter: Protocol): Promise<any> {
  let startTime: number = 10_000_000_000;
  let endTime: number = 0;
  const rawResults: any[] = [];

  await Promise.all(
    Object.entries(adapter).map(async (a: any[]) => {
      const section = a[0];
      let adapterResults = await a[1];
      if (adapterResults.length == null) adapterResults = [adapterResults];

      const results = adapterResults.flat().map((r: AdapterResult) => {
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

      rawResults.push({ section, results });

      startTime = Math.min(
        startTime,
        ...adapterResults.flat().map((r: AdapterResult) => r.start),
      );

      endTime = Math.max(
        endTime,
        ...results
          .flat()
          .map((r: any) =>
            r.continuousEnd == null ? r.timestamp : r.continuousEnd,
          ),
      );
    }),
  );

  const data: any[] = [];
  rawResults.map((r: any) => {
    r.results.map((d: any) =>
      data.push({
        data: rawToChartData(d, startTime, endTime),
        section: r.section,
      }),
    );
  });
  await getChartPng(data);
}

export async function main() {
  await parseData(adapter); // ts-node src/unlocks/utils/test.ts
}
main();
