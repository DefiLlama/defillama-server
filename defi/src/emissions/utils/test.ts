import adapters from "./../protocols";
import {
  AdapterResult,
  StepAdapterResult,
  CliffAdapterResult,
  LinearAdapterResult,
  RawResult,
  RawSection,
  ChartSection,
  Protocol,
} from "../types/adapters";
import { rawToChartData } from "./convertToChartData";
import {
  stepAdapterToRaw,
  cliffAdapterToRaw,
  linearAdapterToRaw,
} from "./convertToRawData";
import { getChartPng } from "./chart";

if (process.argv.length < 3) {
  console.error(`Missing argument, you need to provide the adapter name.
    Eg: ts-node coins/src/test.ts euler`);
  process.exit(1);
}
const protocol = process.argv[2];
const excludedKeys = ["sources"];
export async function parseData(adapter: Protocol): Promise<void> {
  let startTime: number = 10_000_000_000;
  let endTime: number = 0;
  const rawSections: RawSection[] = [];

  await Promise.all(
    Object.entries(adapter.default).map(async (a: any[]) => {
      if (excludedKeys.includes(a[0])) return;
      const section: string = a[0];
      let adapterResults = await a[1];
      if (adapterResults.length == null) adapterResults = [adapterResults];

      const results: RawResult[] | RawResult[][] = adapterResults
        .flat()
        .map((r: AdapterResult) => {
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

      rawSections.push({ section, results });

      startTime = Math.min(
        startTime,
        ...adapterResults.flat().map((r: AdapterResult) => r.start!),
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

  const data: ChartSection[] = [];
  rawSections.map((r: any) => {
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
  console.log(`==== Testing ${protocol} ====`);
  const protocolWrapper = (adapters as any)[protocol];

  if (!protocolWrapper) {
    console.log(
      `The passed protocol name is invalid. Make sure '${protocol}' is a key of './adapters/index.ts'`,
    );
  }

  await parseData(protocolWrapper);
}
main();
// ts-node src/emissions/utils/test.ts convex
