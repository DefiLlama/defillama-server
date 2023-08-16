import { createChartData, mapToServerData, nullFinder } from "../emissions-adapters/utils/convertToChartData";
import { createRawSections } from "../emissions-adapters/utils/convertToRawData";
import { createCategoryData } from "../emissions-adapters/utils/categoryData";
import adapters from "./utils/imports/emissions_adapters";
import { ApiChartData, ChartSection, Protocol, SectionData } from "../emissions-adapters/types/adapters";
import { createFuturesData } from "../emissions-adapters/utils/futures";
import { storeR2JSONString, getR2 } from "./utils/r2";
import { wrapScheduledLambda } from "./utils/shared/wrap";
import protocols from "./protocols/data";
import { sluggifyString } from "./utils/sluggify";
import parentProtocols from "./protocols/parentProtocols";
import { PromisePool } from "@supercharge/promise-pool";
import { shuffleArray } from "./utils/shared/shuffleArray";
import { sendMessage } from "./utils/discord";
import { withTimeout } from "./utils/shared/withTimeout";

const prefix = "coingecko:";

function getCgId(token: string) {
  const idStart = token.indexOf(prefix);
  if (idStart == -1) return null;
  return token.substring(idStart + prefix.length);
}
function findPId(cgId: string | null) {
  if (!cgId) return;
  const parent = parentProtocols.find((p) => p.gecko_id == cgId);
  if (parent) return { parentProtocol: parent.id, name: parent.name, gecko_id: parent.gecko_id };
  return protocols.find((p) => p.gecko_id == cgId);
}

async function aggregateMetadata(
  protocolName: string,
  realTimeChart: ChartSection[],
  documentedChart: ChartSection[],
  rawData: SectionData
) {
  const pId = rawData.metadata.protocolIds?.[0] ?? null;
  const cgId = getCgId(rawData.metadata.token);
  const pData = pId && pId !== "" ? protocols.find((p) => p.id == pId) : findPId(cgId);
  const id = pData ? pData.parentProtocol || pData.name : cgId ? cgId : protocolName;

  const factories: string[] = ["daomaker"];
  if (factories.includes(protocolName) && !(pData || cgId))
    throw new Error(`no metadata for raw token ${rawData.metadata.token}`);

  let name = id;
  if (pData?.parentProtocol) {
    name = parentProtocols.find((p) => p.id === pData.parentProtocol)?.name ?? id;
  }

  const realTimeTokenAllocation = createCategoryData(realTimeChart, rawData.categories);
  const documentedTokenAllocation = createCategoryData(documentedChart, rawData.categories);

  const futures = pData && "symbol" in pData ? await createFuturesData(pData.symbol) : undefined;

  let documentedData;
  let realTimeData;
  if (documentedChart.length) {
    documentedData = { data: mapToServerData(documentedChart), tokenAllocation: documentedTokenAllocation };
    realTimeData = { data: mapToServerData(realTimeChart), tokenAllocation: realTimeTokenAllocation };
  } else {
    documentedData = { data: mapToServerData(realTimeChart), tokenAllocation: realTimeTokenAllocation };
  }

  return {
    data: {
      realTimeData,
      documentedData,
      metadata: rawData.metadata,
      name,
      gecko_id: pData?.gecko_id,
      futures,
    },
    id,
  };
}

async function processSingleProtocol(adapter: Protocol, protocolName: string): Promise<string> {
  const rawData = await createRawSections(adapter);
  nullFinder(rawData.rawSections, "rawSections");

  const { realTimeData, documentedData } = await createChartData(
    protocolName,
    rawData,
    adapter.documented?.replaces ?? []
  );
  nullFinder(realTimeData, "realTimeData");
  // must happen before this line because category datas off
  const { data, id } = await aggregateMetadata(protocolName, realTimeData, documentedData, rawData);

  const sluggifiedId = sluggifyString(id).replace("parent#", "");

  await storeR2JSONString(`emissions/${sluggifiedId}`, JSON.stringify(data));
  console.log(protocolName);

  return sluggifiedId;
}

function filterAdapters(protocolIndexes: number[]): any[] {
  const selected: any[] = [];
  const entries: any[] = Object.entries(adapters);
  for (let i = 0; i < entries.length; i++) {
    if (protocolIndexes.includes(i)) selected.push(entries[i]);
  }
  return selected;
}
async function processProtocolList(protocolIndexes: number[]) {
  let protocolsArray: string[] = [];
  let protocolErrors: string[] = [];

  const protocolAdapters = filterAdapters(protocolIndexes);
  await PromisePool.withConcurrency(2)
    .for(shuffleArray(protocolAdapters))
    .process(async ([protocolName, rawAdapter]) => {
      let adapters = typeof rawAdapter.default === "function" ? await rawAdapter.default() : rawAdapter.default;
      if (!adapters.length) adapters = [adapters];
      await Promise.all(
        adapters.map((adapter: Protocol) =>
          withTimeout(180000, processSingleProtocol(adapter, protocolName), protocolName)
            .then((p: string) => protocolsArray.push(p))
            .catch((err: Error) => {
              console.log(err.message ? `${err.message}: \n storing ${protocolName}` : err);
              protocolErrors.push(protocolName);
            })
        )
      );
    });

  await handlerErrors(protocolErrors);
  const res = await getR2(`emissionsProtocolsList`);
  if (res.body) protocolsArray = [...new Set([...protocolsArray, ...JSON.parse(res.body)])];
  await storeR2JSONString(`emissionsProtocolsList`, JSON.stringify(protocolsArray));
}
async function handler(event: any) {
  try {
    await withTimeout(840000, processProtocolList(event.protocolIndexes));
  } catch (e) {
    process.env.UNLOCKS_WEBHOOK ? await sendMessage(`${e}`, process.env.UNLOCKS_WEBHOOK!) : console.log(e);
  }
}

async function handlerErrors(errors: string[]) {
  if (errors.length > 0) {
    let errorMessage: string = `storeEmissions errors: \n`;
    errors.map((e: string) => (errorMessage += `${e}, `));
    process.env.UNLOCKS_WEBHOOK
      ? await sendMessage(errorMessage, process.env.UNLOCKS_WEBHOOK!)
      : console.log(errorMessage);
  }
}

export default wrapScheduledLambda(handler);
//handler(); // ts-node src/storeEmissions.ts
