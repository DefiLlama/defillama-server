import { createChartData } from "../emissions-adapters/utils/convertToChartData";
import { createRawSections } from "../emissions-adapters/utils/convertToRawData";
import adapters from "./utils/imports/emissions_adapters";
import { ChartSection } from "../emissions-adapters/types/adapters";
import { storeR2JSONString } from "./utils/r2";
import { wrapScheduledLambda } from "./utils/shared/wrap";
import protocols from "./protocols/data";
import { sluggifyString } from "./utils/sluggify";
import parentProtocols from "./protocols/parentProtocols";
import { sendMessage } from "./utils/discord";

function wait(time: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

async function handler() {
  const protocolsArray: string[] = [];
  // https://github.com/apollographql/apollo-client/issues/4843#issuecomment-495717720
  // https://stackoverflow.com/questions/53162001/typeerror-during-jests-spyon-cannot-set-property-getrequest-of-object-which
  for (const [protocolName, adapterPath] of Object.entries(adapters)) {
    try {
      console.log(protocolName);
      await wait(2000);
      const rawAdapter = require(adapterPath);
      const adapter = typeof rawAdapter.default === "function" ? { default: await rawAdapter.default() } : rawAdapter;
      const rawData = await createRawSections(adapter);

      const chart = (await createChartData(protocolName, rawData, false)).map((s: ChartSection) => ({
        label: s.section,
        data: s.data.apiData,
      }));

      const pId = rawData.metadata?.protocolIds?.[0] ?? null;
      const pData = pId && pId !== "" ? protocols.find((p) => p.id == pId) : null;
      const id = pData ? pData.parentProtocol || pData.name : protocolName;
      let name = id;
      if (pData?.parentProtocol) {
        name = parentProtocols.find((p) => p.id === pData.parentProtocol)?.name ?? id;
      }
      const data = {
        data: chart,
        metadata: rawData.metadata,
        name: name,
        gecko_id: pData?.gecko_id,
      };
      const sluggifiedId = sluggifyString(id).replace("parent#", "");

      await storeR2JSONString(`emissions/${sluggifiedId}`, JSON.stringify(data), 3600);
      protocolsArray.push(sluggifiedId);
    } catch (err) {
      console.log(err, ` storing ${protocolName}`);
    }
  }

  const errorMessage: string = `Tried to write emissionsProtocolsList as an empty array, Unlocks page needs updating manually.`;

  if (protocolsArray.length == 0) {
    //await sendMessage(errorMessage, process.env.TEAM_WEBHOOK!);
    throw new Error(errorMessage);
  } else {
    await storeR2JSONString(`emissionsProtocolsList`, JSON.stringify(protocolsArray));
  }
}

export default wrapScheduledLambda(handler);

async function main() {
  let a = await handler();
  return;
}
main(); // ts-node src/storeEmissions.ts
