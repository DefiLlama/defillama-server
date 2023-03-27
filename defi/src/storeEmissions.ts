import { createChartData } from "../emissions-adapters/utils/convertToChartData";
import { createRawSections } from "../emissions-adapters/utils/convertToRawData";
import adapters from "./utils/imports/emissions_adapters";
import { ChartSection } from "../emissions-adapters/types/adapters";
import { storeR2JSONString } from "./utils/r2";
import { wrapScheduledLambda } from "./utils/shared/wrap";
import protocols from "./protocols/data";
import standardizeProtocolName from "./utils/standardizeProtocolName";

async function handler() {
  const protocolsArray: string[] = [];

  await Promise.all(
    Object.entries(adapters).map(async ([protocolName, rawAdapter]: [string, any]) => {
      try {
        const adapter = typeof rawAdapter.default === "function" ? { default: await rawAdapter.default() } : rawAdapter;
        const { rawSections, startTime, endTime, metadata } = await createRawSections(adapter);

        const chart = createChartData(rawSections, startTime, endTime, false).map((s: ChartSection) => ({
          label: s.section,
          data: s.data.apiData,
        }));

        const pId = metadata?.protocolIds?.[0] ?? null;
        const pData = pId && pId !== "" ? protocols.find((p) => p.id == pId) : null;
        const name = pData ? pData.parentProtocol || pData.name : protocolName;
        const data = { data: chart, metadata, name: name, gecko_id: pData?.gecko_id };

        await storeR2JSONString(`emissions/${standardizeProtocolName(name)}`, JSON.stringify(data), 3600);

        protocolsArray.push(standardizeProtocolName(name));
      } catch (err) {
        console.log(err, ` storing ${protocolName}`);
      }
    })
  );

  await storeR2JSONString(`emissionsProtocolsList`, JSON.stringify(protocolsArray), 3600);
}

export default wrapScheduledLambda(handler);
