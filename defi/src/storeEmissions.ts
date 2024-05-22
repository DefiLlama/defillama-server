import fetch from "node-fetch";
import { PromisePool } from "@supercharge/promise-pool";
import { createChartData, mapToServerData, nullFinder } from "../emissions-adapters/utils/convertToChartData";
import { createRawSections } from "../emissions-adapters/utils/convertToRawData";
import { createCategoryData } from "../emissions-adapters/utils/categoryData";
import adapters from "./utils/imports/emissions_adapters";
import { ChartSection, EmissionBreakdown, Protocol, SectionData } from "../emissions-adapters/types/adapters";
import { createFuturesData } from "../emissions-adapters/utils/futures";
import { storeR2JSONString, getR2 } from "./utils/r2";
import protocols from "./protocols/data";
import { sluggifyString } from "./utils/sluggify";
import parentProtocols from "./protocols/parentProtocols";
import { shuffleArray } from "./utils/shared/shuffleArray";
import { sendMessage } from "./utils/discord";
import { withTimeout } from "./utils/shared/withTimeout";
import setEnvSecrets from "./utils/shared/setEnvSecrets";

const prefix = "coingecko:";

function getCgId(token: string) {
  const idStart = token.indexOf(prefix);
  if (idStart == -1) return null;
  return token.substring(idStart + prefix.length);
}
function findPId(cgId?: string | null, parentId?: string) {
  if (!cgId && !parentId) return;
  const parent = parentProtocols.find((p) => (parentId ? p.id == parentId : p.gecko_id == cgId));
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
  const pData0 = protocols.find((p) => p.id == pId);
  const cgId = getCgId(rawData.metadata.token) ?? pData0?.gecko_id;
  const pData = findPId(cgId, pId?.startsWith("parent#") ? pId : pData0?.parentProtocol) ?? pData0;
  const id = pData ? pData.name : cgId ? cgId : protocolName;

  const factories: string[] = ["daomaker"];
  if (factories.includes(protocolName) && !(pData || cgId))
    throw new Error(`no metadata for raw token ${rawData.metadata.token}`);

  let name = id;
  let gecko_id = pData?.gecko_id;

  if (pData?.parentProtocol) {
    name = parentProtocols.find((p) => p.id === pData.parentProtocol)?.name ?? id;
    gecko_id = parentProtocols.find((p) => p.id === pData.parentProtocol)?.gecko_id ?? pData?.gecko_id;
  }

  const realTimeTokenAllocation = createCategoryData(realTimeChart, rawData.categories);
  const documentedTokenAllocation = createCategoryData(documentedChart, rawData.categories);

  const futures = pData && "symbol" in pData ? await createFuturesData(pData.symbol) : undefined;

  let documentedData;
  let realTimeData;
  if (documentedChart.length) {
    documentedData = {
      data: mapToServerData(documentedChart),
      tokenAllocation: documentedTokenAllocation,
    };
    realTimeData = {
      data: mapToServerData(realTimeChart),
      tokenAllocation: realTimeTokenAllocation,
    };
  } else {
    documentedData = {
      data: mapToServerData(realTimeChart),
      tokenAllocation: realTimeTokenAllocation,
    };
  }

  return {
    data: {
      realTimeData,
      documentedData,
      metadata: rawData.metadata,
      name,
      gecko_id,
      futures,
      categories: rawData.categories,
    },
    id,
  };
}

async function getPricedUnlockChart(emissionData: Awaited<ReturnType<typeof aggregateMetadata>>["data"]) {
  try {
    const incentiveCtegories = ["farming"];

    const currDate = new Date().getTime() / 1000;
    const incentiveCtegoriesNames = incentiveCtegories.map((cat) => emissionData?.categories[cat]).flat();

    const unlocksByTimestamp: Record<string, number> = {};
    const now = new Date().getTime() / 1000;

    emissionData.documentedData.data.forEach(
      (chart: { data: Array<{ timestamp: number; unlocked: number }>; label: string }) => {
        if (!incentiveCtegoriesNames?.includes(chart.label)) return;
        chart.data
          .filter((val) => val.timestamp < currDate)
          .forEach((val) => {
            if (val.timestamp < now)
              unlocksByTimestamp[val.timestamp] = (unlocksByTimestamp[val.timestamp] || 0) + val.unlocked;
          });
      },
      {}
    );

    const timestamps = Object.keys(unlocksByTimestamp);
    const prices: Record<string, number> = {};

    const token = emissionData?.metadata?.token;

    if (token) {
      await Promise.all(
        timestamps.map(async (ts) => {
          const price = await fetch(
            `https://coins.llama.fi/prices/historical/${ts}/${token}/?apikey=${process.env.APIKEY}`
          )
            .then((r) => r.json())
            .catch(() => {});

          prices[ts] = price?.coins?.[token]?.price;
        })
      );
    }

    const chartsWithPrices = Object.entries(unlocksByTimestamp)
      .sort((a: any, b: any) => a[0] - b[0])
      .map(([ts, unlocked]: [string, number], i, arr: any[]) => [ts, (unlocked - arr?.[i - 1]?.[1]) * prices[ts] || 0]);

    return chartsWithPrices;
  } catch (e) {
    console.error(e);
    return [];
  }
}

const getDateByDaysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).getTime() / 1000;
const sum = (arr: number[]) => arr.reduce((acc, val) => acc + val, 0);

async function processSingleProtocol(
  adapter: Protocol,
  protocolName: string,
  emissionsBrakedown: EmissionBreakdown
): Promise<string> {
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
  const unlockUsdChart = await getPricedUnlockChart(data);
  const weekAgo = getDateByDaysAgo(7);
  const dayAgo = getDateByDaysAgo(1);
  const monthAgo = getDateByDaysAgo(30);

  const [day, week, month]: number[][] = [[], [], []];

  const sluggifiedId = sluggifyString(id).replace("parent#", "");
  unlockUsdChart.forEach(([ts, val]) => {
    if (Number(val) < 0) return;
    if (Number(ts) > monthAgo) month.push(Number(val));
    if (Number(ts) > weekAgo) week.push(Number(val));
    if (Number(ts) > dayAgo) day.push(Number(val));
  });

  const breakdown = {
    emission24h: sum(day),
    emission7d: sum(week),
    emission30d: sum(month),
  };

  if (sum(Object.values(breakdown)) > 0) emissionsBrakedown[sluggifiedId] = breakdown;

  await storeR2JSONString(`emissions/${sluggifiedId}`, JSON.stringify({ ...data, unlockUsdChart }));

  return sluggifiedId;
}
async function processProtocolList() {
  let protocolsArray: string[] = [];
  let protocolErrors: string[] = [];
  let emissionsBrakedown: EmissionBreakdown = {};

  await setEnvSecrets();
  const protocolAdapters = Object.entries(adapters);
  await PromisePool.withConcurrency(5)
    .for(shuffleArray(protocolAdapters))
    .process(async ([protocolName, rawAdapter]) => {
      let adapters = typeof rawAdapter.default === "function" ? await rawAdapter.default() : rawAdapter.default;
      if (!adapters.length) adapters = [adapters];
      await Promise.all(
        adapters.map((adapter: Protocol) =>
          withTimeout(6000000, processSingleProtocol(adapter, protocolName, emissionsBrakedown), protocolName)
            .then((p: string) => protocolsArray.push(p))
            .catch((err: Error) => {
              console.log(err.message ? `${err.message}: \n storing ${protocolName}` : err);
              protocolErrors.push(protocolName);
            })
        )
      );
    });

  await handlerErrors(protocolErrors);

  // await storeR2JSONString("emissionsProtocolsList", JSON.stringify([...new Set(protocolsArray)]));

  // await storeR2JSONString("emissionsBreakdown", JSON.stringify(emissionsBrakedown));
}
export async function handler() {
  try {
    await withTimeout(8400000, processProtocolList());
  } catch (e) {
    process.env.UNLOCKS_WEBHOOK ? await sendMessage(`${e}`, process.env.UNLOCKS_WEBHOOK!) : console.log(e);
  }
  process.exit();
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

// export default wrapScheduledLambda(handler);
handler(); // ts-node defi/src/storeEmissions.ts
