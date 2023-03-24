import { createChartData } from "../emissions-adapters/utils/convertToChartData";
import { createRawSections } from "../emissions-adapters/utils/convertToRawData";
import * as adapters from "../emissions-adapters/protocols";
import { ChartSection, Protocol } from "../emissions-adapters/types/adapters";
import { storeR2JSONString } from "./utils/r2";
import { wrapScheduledLambda } from "./utils/shared/wrap";
import protocols from "./protocols/data";
import standardizeProtocolName from "./utils/standardizeProtocolName";

async function handler() {
  const protocolsArray: string[] = [];
  const promises: Promise<any>[] = [];

  adapters.index.map(async (protocolName: string) => {
    try {
      const adapter: Protocol = await import(`../emissions-adapters/protocols/${protocolName}`);
      const { rawSections, startTime, endTime, metadata } = await createRawSections(adapter);

      const chart = createChartData(rawSections, startTime, endTime, false).map((s: ChartSection) => ({
        label: s.section,
        data: s.data.apiData,
      }));

      const pId = metadata?.protocolIds?.[0] ?? null;
      const pData = pId && pId !== "" ? protocols.find((p) => p.id == pId) : null;
      const data = { data: chart, metadata, name: pData?.name ?? protocolName, gecko_id: pData?.gecko_id };

      promises.push(
        storeR2JSONString(
          `emissions/${standardizeProtocolName(pData?.name ?? protocolName)}`,
          JSON.stringify(data),
          3600
        )
      );

      protocolsArray.push(protocolName);
    } catch {
      console.log(protocolName);
    }
  });

  await Promise.all(promises);
}

export default wrapScheduledLambda(handler);
