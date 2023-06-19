import { createChartData } from "../emissions-adapters/utils/convertToChartData";
import { createRawSections } from "../emissions-adapters/utils/convertToRawData";
import { createCategoryData } from "../emissions-adapters/utils/categoryData";
import adapters from "./utils/imports/emissions_adapters";
import { ApiChartData, ChartSection, Protocol, SectionData } from "../emissions-adapters/types/adapters";
import { storeR2JSONString, getR2 } from "./utils/r2";
import { wrapScheduledLambda } from "./utils/shared/wrap";
import protocols from "./protocols/data";
import { sluggifyString } from "./utils/sluggify";
import parentProtocols from "./protocols/parentProtocols";
import { PromisePool } from "@supercharge/promise-pool";
import { shuffleArray } from "./utils/shared/shuffleArray";
import { sendMessage } from "./utils/discord";

type Chart = { label: string; data: ApiChartData[] | undefined };

function findPId(token: string) {
  const prefix = "coingecko:";
  const idStart = token.indexOf(prefix);
  if (idStart == -1) return null;
  const cgId = token.substring(idStart + prefix.length);
  return protocols.find((p) => p.gecko_id == cgId);
}

function aggregateMetadata(chart: Chart[], rawData: SectionData) {
  const pId = rawData.metadata.protocolIds?.[0] ?? null;
  const pData = pId && pId !== "" ? protocols.find((p) => p.id == pId) : findPId(rawData.metadata.token);
  if (!pData) throw new Error(`token ${rawData.metadata.token} has no pData`);
  const id = pData.parentProtocol || pData.name;
  let name = id;
  if (pData?.parentProtocol) {
    name = parentProtocols.find((p) => p.id === pData.parentProtocol)?.name ?? id;
  }

  const tokenAllocation = createCategoryData(chart, rawData.categories, false);

  return {
    data: {
      data: chart,
      metadata: rawData.metadata,
      name: name,
      gecko_id: pData?.gecko_id,
      tokenAllocation,
    },
    id,
  };
}

async function processSingleProtocol(
  adapter: Protocol,
  protocolName: string,
  protocolsArray: string[]
): Promise<string[]> {
  const rawData = await createRawSections(adapter);

  const chart: Chart[] = (await createChartData(protocolName, rawData, false)).map((s: ChartSection) => ({
    label: s.section,
    data: s.data.apiData,
  }));

  const { data, id } = aggregateMetadata(chart, rawData);
  const sluggifiedId = sluggifyString(id).replace("parent#", "");

  await storeR2JSONString(`emissions/${sluggifiedId}`, JSON.stringify(data));
  protocolsArray.push(sluggifiedId);
  console.log(protocolName);

  return protocolsArray;
}

async function handler() {
  let protocolsArray: string[] = [];
  let protocolErrors: string[] = [];

  await PromisePool.withConcurrency(2)
    .for(shuffleArray(Object.entries(adapters)))
    .process(async ([protocolName, rawAdapter]) => {
      try {
        let adapters = typeof rawAdapter.default === "function" ? await rawAdapter.default() : rawAdapter.default;
        if (!adapters.length) adapters = [adapters];
        await Promise.all(
          adapters.map((adapter: Protocol) =>
            processSingleProtocol(adapter, protocolName, protocolsArray)
              .then((p: string[]) => (protocolsArray = p))
              .catch((err: Error) => {
                console.log(err.message, `: \n storing ${protocolName}`);
                protocolErrors.push(protocolName);
              })
          )
        );
      } catch (err) {
        console.log(err, ` storing ${protocolName}`);
        protocolErrors.push(protocolName);
      }
    });

  await handlerErrors(protocolErrors);
  const res = await getR2(`emissionsProtocolsList`);
  if (res.body) protocolsArray = [...new Set([...protocolsArray, ...JSON.parse(res.body)])];
  await storeR2JSONString(`emissionsProtocolsList`, JSON.stringify(protocolsArray));
}

async function handlerErrors(errors: string[]) {
  if (errors.length > 0) {
    let errorMessage: string = `storeEmissions errors: `;
    errors.map((e: string) => (errorMessage += `${e}, `));
    await sendMessage(errorMessage, process.env.TEAM_WEBHOOK!);
    throw new Error(errorMessage);
  }
}

export default wrapScheduledLambda(handler);
// handler(); // ts-node src/storeEmissions.ts
