import fetch from "node-fetch";
import { createChartData, mapToServerData, nullFinder } from "../emissions-adapters/utils/convertToChartData";
import { createRawSections } from "../emissions-adapters/utils/convertToRawData";
import { createCategoryData, createSectionData } from "../emissions-adapters/utils/categoryData";
import { ChartSection, EmissionBreakdown, Protocol, SectionData } from "../emissions-adapters/types/adapters";
import { createFuturesData } from "../emissions-adapters/utils/futures";
import { storeR2JSONString, getR2 } from "./utils/r2";
import protocols from "./protocols/data";
import { sluggifyString } from "./utils/sluggify";
import parentProtocols from "./protocols/parentProtocols";
import { getDisplayChainName } from "./adaptors/utils/getAllChainsFromAdaptors";
import { protocolsIncentives } from "../emissions-adapters/no-emissions/incentives";

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
  let defillamaIds = [rawData.metadata.protocolIds?.[0]].filter(Boolean)
  const protocolCategory = protocols.find(p => p.id === pId || p.parentProtocol === pId)?.category;
  //transform parent#id to ids
  if (pId?.startsWith("parent#")) {
    const childIds = protocols
    .filter(protocol => protocol.parentProtocol === pId)
    .map(protocol => protocol.id);

    defillamaIds = childIds.length ? childIds : [];
  }


  const factories: string[] = ["daomaker"];
  if (factories.includes(protocolName) && !(pData || cgId))
    throw new Error(`no metadata for raw token ${rawData.metadata.token}`);

  let name = id;
  let gecko_id = pData?.gecko_id ?? cgId;

  if (pData?.parentProtocol) {
    name = parentProtocols.find((p) => p.id === pData.parentProtocol)?.name ?? id;
    gecko_id = parentProtocols.find((p) => p.id === pData.parentProtocol)?.gecko_id ?? pData?.gecko_id;
  }

  const realTimeTokenAllocation = createCategoryData(realTimeChart, rawData.categories);
  const realTimeSectionAllocation = createSectionData(realTimeChart);
  const documentedTokenAllocation = createCategoryData(documentedChart, rawData.categories);
  const documentedSectionAllocation = createSectionData(documentedChart);

  const futures = pData && "symbol" in pData ? await createFuturesData(pData.symbol) : undefined;
  const chainName = getDisplayChainName(rawData.metadata?.chain ?? "");

  let documentedData;
  let realTimeData;
  if (documentedChart.length) {
    documentedData = {
      data: mapToServerData(documentedChart),
      tokenAllocation: {
        ...documentedTokenAllocation,
        bySection: documentedSectionAllocation,
      },
    };
    realTimeData = {
      data: mapToServerData(realTimeChart),
      tokenAllocation: {
        ...realTimeTokenAllocation,
        bySection: realTimeSectionAllocation,
      },
    };
  } else {
    documentedData = {
      data: mapToServerData(realTimeChart),
      tokenAllocation: {
        ...realTimeTokenAllocation,
        bySection: realTimeSectionAllocation,
      },
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
      defillamaIds,
      categories: rawData.categories,
      protocolCategory,
      chainName,
      pId
    },
    id,
  };
}

async function getPricedUnlockChart(emissionData: Awaited<ReturnType<typeof aggregateMetadata>>["data"]) {
  try {
    const hasIncentives = emissionData.pId ? protocolsIncentives.includes(emissionData.pId) : false;
    
    if (!hasIncentives) {
      return [];
    }
    
    const incentiveCtegories = ["farming"];

    const currDate = new Date().getTime() / 1000;
    const incentiveCtegoriesNames = incentiveCtegories.map((cat) => emissionData?.categories[cat]).flat();

    const unlocksByTimestamp: Record<string, number> = {};
    const now = new Date().getTime() / 1000;

    emissionData.documentedData.data.forEach(
      (chart: { data: Array<{ timestamp: number; rawEmission: number }>; label: string }) => {
        if (!incentiveCtegoriesNames?.includes(chart.label)) return;
        chart.data
          .filter((val) => val.timestamp < currDate)
          .forEach((val) => {
            if (val.timestamp < now)
              unlocksByTimestamp[val.timestamp] = (unlocksByTimestamp[val.timestamp] || 0) + val.rawEmission;
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
            `https://coins.llama.fi/prices/historical/${ts}/${token}?apikey=${process.env.APIKEY}`
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

export async function processSingleProtocol(
  adapter: Protocol,
  protocolName: string,
  emissionsBrakedown: EmissionBreakdown,
  backfill: boolean = false
): Promise<string> {
  const rawData = await createRawSections(adapter, backfill);
  nullFinder(rawData.rawSections, "rawSections");

  const { realTimeData, documentedData } = await createChartData(
    protocolName,
    rawData,
    adapter.documented?.replaces ?? [],
    backfill
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
    name: data.name,
    defillamaId: data.defillamaIds[0] || "",
    linked: data.defillamaIds.length > 1 ? data.defillamaIds.slice(1) : [],
    category: data.protocolCategory,
    chain: data.chainName,
    emission24h: sum(day),
    emission7d: sum(week),
    emission30d: sum(month),
  };

  if (sum([breakdown.emission24h, breakdown.emission7d, breakdown.emission30d]) > 0) emissionsBrakedown[sluggifiedId] = breakdown;

  await storeR2JSONString(`emissions/${sluggifiedId}`, JSON.stringify({ ...data, unlockUsdChart }));

  return sluggifiedId;
}
