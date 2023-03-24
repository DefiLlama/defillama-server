import { createChartData } from "../emissions-adapters/utils/convertToChartData";
import { createRawSections } from "../emissions-adapters/utils/convertToRawData";
import adapters from "../emissions-adapters/protocols";
import { ChartSection, Protocol } from "../emissions-adapters/types/adapters";
import { storeR2JSONString } from "./utils/r2";
import { wrapScheduledLambda } from "./utils/shared/wrap";
import fs from "fs";
import { resolve } from "path";
import protocols from "./protocols/data";

const saveLocation = "../emissions-adapters/protocols/protocolsArray.ts";

async function handler() {
  const protocolsArray: string[] = [];
  const promises: Promise<any>[] = [];

  Object.keys(adapters).map(async (protocolName) => {
    try {
      const adapter: Protocol = (adapters as any)[protocolName];
      const { rawSections, startTime, endTime, metadata } =
        await createRawSections(adapter);

      const chart = createChartData(rawSections, startTime, endTime, false).map(
        (s: ChartSection) => ({
          label: s.section,
          data: s.data.apiData,
        }),
      );
      const pId = metadata?.protocolIds?.[0] ?? null;
      const pName =
        pId && pId !== ""
          ? protocols.find((p) => p.id == pId)?.name ?? null
          : null;
      const data = { data: chart, metadata, name: pName || protocolName };
      promises.push(
        storeR2JSONString(
          `emissions/${protocolName}`,
          JSON.stringify(data),
          3600,
        ),
      );

      protocolsArray.push(`"${protocolName}"`);
    } catch (e) {
      console.log(protocolName);
    }
  });

  promises.push(
    storeR2JSONString(
      `emissions/index`,
      JSON.stringify({ data: protocolsArray }),
      3600,
    ),
  );

  let a = await Promise.all(promises);
  return;
}

export default wrapScheduledLambda(handler);

async function main() {
  let a = await handler();
  return;
}
main(); // ts-node src/storeEmissions.ts
