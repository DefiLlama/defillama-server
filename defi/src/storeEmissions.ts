import { createChartData } from "../emissions-adapters/utils/convertToChartData";
import { createRawSections } from "../emissions-adapters/utils/convertToRawData";
import { createCategoryData } from "../emissions-adapters/utils/categoryData";
import { createFuturesData } from "../emissions-adapters/utils/futures";
import adapters from "./utils/imports/emissions_adapters";
import { ChartSection } from "../emissions-adapters/types/adapters";
import { storeR2JSONString, getR2 } from "./utils/r2";
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
  let protocolsArray: string[] = [];
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

      const tokenAllocation = createCategoryData(chart, rawData.categories, false);

      const pId = rawData.metadata?.protocolIds?.[0] ?? null;
      const pData = pId && pId !== "" ? protocols.find((p) => p.id == pId) : null;
      const id = pData ? pData.parentProtocol || pData.name : protocolName;
      let name = id;
      if (pData?.parentProtocol) {
        name = parentProtocols.find((p) => p.id === pData.parentProtocol)?.name ?? id;
      }

      const futures = pData?.symbol ? await createFuturesData(pData.symbol) : undefined;

      const data = {
        data: chart,
        metadata: rawData.metadata,
        name: name,
        gecko_id: pData?.gecko_id,
        tokenAllocation,
        futures,
      };
      const sluggifiedId = sluggifyString(id).replace("parent#", "");

      await storeR2JSONString(`emissions/${sluggifiedId}`, JSON.stringify(data));
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
    const res = await getR2(`emissionsProtocolsList`);
    if (res.body) protocolsArray = [...new Set([...protocolsArray, ...JSON.parse(res.body)])];
    await storeR2JSONString(`emissionsProtocolsList`, JSON.stringify(protocolsArray));
  }
}

export default wrapScheduledLambda(handler);

handler(); // ts-node src/storeEmissions.ts
