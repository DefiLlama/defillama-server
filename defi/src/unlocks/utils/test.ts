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

// export async function generateChart(adapter: Protocol): Promise<ChartData> {
//   let adapterResults = await adapter;
//   //if (adapterResults.length == null) adapterResults = [adapterResults];
//   const rawResults = adapterResults.map((r: AdapterResult) => {
//     switch (r.type) {
//       case "step":
//         return stepAdapterToRaw(<StepAdapterResult>r);
//       case "cliff":
//         return cliffAdapterToRaw(<CliffAdapterResult>r);
//       case "linear":
//         return linearAdapterToRaw(<LinearAdapterResult>r);
//       default:
//         return [];
//     }
//   });

//   const bigUnixTime: number = 10_000_000_000;
//   const startTime: number = Math.min(
//     ...adapterResults.map((r: AdapterResult) =>
//       r.start == null ? bigUnixTime : r.start,
//     ),
//   );

//   const data = rawResults.map((r: RawResult[]) => rawToChartData(r, startTime));

//   const xAxis: number[] = Array.from(
//     Array(
//       Number(Math.max(...data.map((d: ChartYAxisData) => d.data.length))),
//     ).keys(),
//   ).map((i: number) => startTime + i * data[0].increment);

//   return { data, xAxis };
// }
async function generateChart(adapter: Protocol): Promise<ChartData> {
  const a = await Promise.all(
    Object.entries(adapter).map(async (a: any[]) => {
      const section = a[0];
      const emissions = await a[1];
      return { section, emissions };
    }),
  );
  return { data: [], xAxis: [] };
}
generateChart(tornado); // ts-node utils/test.ts
