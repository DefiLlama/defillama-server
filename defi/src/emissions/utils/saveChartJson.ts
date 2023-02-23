import fs from "fs";
import { createChartData } from "./convertToChartData";
import { createRawSections } from "./convertToRawData";
import adapters from "../protocols";
import { ChartSection, Protocol } from "../types/adapters";

if (process.argv.length < 3) {
  console.error(`Missing argument, you need to provide the adapter name.
      Eg: ts-node defi/src/emissions/utils/saveChartJson.ts aave`);
  process.exit(1);
}
const protocol = process.argv[2];

async function main() {
  // for (let protocol of Object.keys(adapters)) {
  const adapter: Protocol = (adapters as any)[protocol];
  if (!adapter)
    throw new Error(`${protocol} doesn't seem to be a valid protocol`);
  const { rawSections, startTime, endTime } = await createRawSections(adapter);
  const data = createChartData(rawSections, startTime, endTime, false).map(
    (s: ChartSection) => ({
      label: s.section,
      data: s.data.apiData,
    }),
  );
  fs.writeFile(
    `defi/src/emissions/charts/${protocol}.json`,
    JSON.stringify({ data }),
    function (err) {
      if (err) {
        console.log(err);
      }
    },
  );
  console.log(`saved ${protocol} chart`);
  // }
}
main();
