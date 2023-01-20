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
import { getChartPng } from "./client";

export async function parseData(adapter: Protocol): Promise<any> {
  let timestamp: number[] = [];

  const unlocked = await Promise.all(
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
        timestamp = [...new Set([...d.timestamp, ...timestamp])];
      });
      return { data, section };
    }),
  );

  await getChartPng({ timestamp, unlocked });
}

export async function main() {
  const data = await parseData(tornado); // ts-node src/unlocks/utils/test.ts
}
main();
