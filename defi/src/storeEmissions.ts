import { createChartData } from "../emissions-adapters/utils/convertToChartData";
import { createRawSections } from "../emissions-adapters/utils/convertToRawData";
import adapters from "../emissions-adapters/protocols";
import { ChartSection, Protocol } from "../emissions-adapters/types/adapters";
import { storeR2JSONString } from "./utils/r2";
import { wrapScheduledLambda } from "./utils/shared/wrap";
import fs from "fs";
import { resolve } from "path";

const saveLocation = "../emissions-adapters/protocols/protocolsArray.ts";

async function handler() {
  const protocolsArray: string[] = [];
  await Promise.all(
    Object.keys(adapters).map(async (protocolName) => {
      const adapter: Protocol = (adapters as any)[protocolName];
      const { rawSections, startTime, endTime, metadata } =
        await createRawSections(adapter);
      const chart = createChartData(rawSections, startTime, endTime, false).map(
        (s: ChartSection) => ({
          label: s.section,
          data: s.data.apiData,
        }),
      );
      const data = { data: chart, metadata };
      await storeR2JSONString(
        `emissions/${protocolName}`,
        JSON.stringify(data),
        3600,
      );
      protocolsArray.push(`"${protocolName}"`);
    }),
  );

  const path: string = resolve(__dirname, saveLocation);
  fs.writeFile(
    path,
    `export const protocols: string[] = [${protocolsArray.toString()}]`,
    function (err) {
      if (err) {
        return console.log(err);
      }
      console.log(`Protocols array successfully saved!`);
    },
  );
}

export default wrapScheduledLambda(handler);

async function main() {
  let a = await handler();
  return;
}
main(); // ts-node src/storeEmissions.ts
