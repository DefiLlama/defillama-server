import fetch from "node-fetch";
import { cache, getLastHourlyRecord } from "../cache";
import { readRouteData } from "../cache/file-cache";
import { getR2 } from "../../utils/r2";
import { ResolvedEntity } from "./entityResolver";

export async function fetchMetrics(
  entities: Map<string, ResolvedEntity | null>,
  metrics: MetricType[],
  timeframe: Timeframe
): Promise<BatchCurrentResponse> {
  const geckoIds: string[] = [];
  for (const entity of entities.values()) {
    if (entity?.geckoId) {
      geckoIds.push(entity.geckoId);
    }
  }

  const needsCG = metrics.some((m) => ["mcap", "fdv", "price", "ofdv"].includes(m));
  const needsSupply = metrics.includes("ofdv");
  const needsStablecoins = metrics.includes("stablecoins");

  const [cgDataMap, supplyMetrics, stablecoinChainsData] = await Promise.all([
    needsCG ? fetchCoinGeckoBatch(geckoIds) : {},
    needsSupply ? fetchSupplyMetrics() : {},
    needsStablecoins ? fetchStablecoinsChains() : [],
  ]);

  const sharedData: SharedData = {
    cgDataMap,
    supplyMetrics,
    stablecoinsData: {},
    stablecoinChainsData,
  };

  const data: Record<string, EntityMetrics> = {};
  const errors: Record<string, string> = {};

  const entries = [...entities.entries()];
  const results = await Promise.all(
    entries.map(async ([slug, entity]) => {
      if (!entity) {
        return { slug, error: "Entity not found" };
      }
      const metrics_result = await assembleEntityMetrics(entity, metrics, timeframe, sharedData);
      return { slug, data: metrics_result };
    })
  );

  for (const result of results) {
    if ("error" in result) {
      errors[result.slug] = result.error ?? "";
    } else if (result.data) {
      data[result.slug] = result.data;
    }
  }

  return {
    success: true,
    timestamp: Math.floor(Date.now() / 1000),
    data,
    ...(Object.keys(errors).length > 0 ? { errors } : {}),
    meta: {
      requestedCount: entities.size,
      successCount: Object.keys(data).length,
      timeframe,
    },
  };
}

const formatHistoricalMetricData = (
  historicalMetricsByDate: Record<string, Record<string, number>>,
  metric: string,
  metricHistoricalData: [number, number][],
  dateRange: { from: string; to: string }
) => {
  const dateRangeValues = pickDateRangeValues(metricHistoricalData, dateRange);

  for (const [date, value] of Object.entries(dateRangeValues)) {
    if (!historicalMetricsByDate[date]) historicalMetricsByDate[date] = {};
    historicalMetricsByDate[date][metric] = value;
  }
};

export async function fetchHistoricalMetrics(
  entities: Map<string, ResolvedEntity | null>,
  metrics: MetricType[],
  dateRange: { from: string; to: string }
): Promise<BatchHistoricalResponse> {
  const geckoIds: string[] = [];
  for (const entity of entities.values()) {
    if (entity?.geckoId) {
      geckoIds.push(entity.geckoId);
    }
  }

  const needsCG = metrics.some((m) => ["mcap", "price", "fdv"].includes(m));
  const cgDataMap = needsCG ? await fetchCoinGeckoBatch(geckoIds) : {};

  const data: Record<string, { name: string; type: "protocol" | "chain"; history: HistoricalDataPoint[] }> = {};
  const errors: Record<string, string> = {};

  const entries = [...entities.entries()];
  const results = await Promise.all(
    entries.map(async ([slug, entity]) => {
      if (!entity) {
        return { slug, error: "Entity not found" };
      }

      try {
        const cgData = entity.geckoId ? cgDataMap[entity.geckoId] : null;

        const fetchPromises: Promise<any>[] = [];
        const fetchKeys: string[] = [];

        if (metrics.includes("tvl") || metrics.includes("borrows")) {
          if (entity.type === "protocol") {
            fetchPromises.push(fetchProtocolMiniData(entity.slug));
            fetchKeys.push("protocolMini");
          } else {
            fetchPromises.push(fetchChainHistoricalTvl(entity.name));
            fetchKeys.push("chainTvl");
          }
        }

        const dimensionMetrics = metrics.filter((m) =>
          ["fees", "revenue", "holdersRevenue", "dexVolume", "perpsVolume"].includes(m)
        );
        for (const metric of dimensionMetrics) {
          fetchPromises.push(fetchDimensionHistoricalData(entity, metric));
          fetchKeys.push(metric);
        }

        if (metrics.includes("stablecoins") && entity.type === "chain") {
          fetchPromises.push(fetchStablecoinsHistorical(entity.name));
          fetchKeys.push("stablecoins");
        }

        const fetchResults = await Promise.all(fetchPromises);
        const fetchData: Record<string, any> = {};
        fetchKeys.forEach((key, i) => {
          fetchData[key] = fetchResults[i];
        });

        const historicalMetricsByDate: Record<string, Record<string, number>> = {};

        if (metrics.includes("price") && cgData?.data?.prices) {
          formatHistoricalMetricData(historicalMetricsByDate, "price", cgData.data.prices, dateRange);
        }

        if (metrics.includes("mcap") && cgData?.data?.mcaps) {
          formatHistoricalMetricData(historicalMetricsByDate, "mcap", cgData.data.mcaps, dateRange);
        }

        if (metrics.includes("tvl")) {
          if (entity.type === "protocol" && fetchData.protocolMini?.tvl) {
            formatHistoricalMetricData(historicalMetricsByDate, "tvl", fetchData.protocolMini.tvl, dateRange);
          } else if (entity.type === "chain" && fetchData.chainTvl) {
            formatHistoricalMetricData(historicalMetricsByDate, "tvl", fetchData.chainTvl, dateRange);
          }
        }

        if (metrics.includes("borrows") && entity.type === "protocol") {
          const borrowsData = fetchData.protocolMini?.chainTvls?.borrowed?.tvl;
          if (borrowsData) {
            formatHistoricalMetricData(historicalMetricsByDate, "borrows", borrowsData, dateRange);
          }
        }

        for (const metric of dimensionMetrics) {
          const chartData = fetchData[metric];
          if (chartData) {
            formatHistoricalMetricData(historicalMetricsByDate, metric, chartData, dateRange);
          }
        }

        if (metrics.includes("stablecoins") && entity.type === "chain" && fetchData.stablecoins) {
          formatHistoricalMetricData(historicalMetricsByDate, "stablecoins", fetchData.stablecoins, dateRange);
        }

        if (metrics.includes("fdv") && cgData?.data?.fdvs) {
          formatHistoricalMetricData(historicalMetricsByDate, "fdv", cgData.data.fdvs, dateRange);
        }

        const history: HistoricalDataPoint[] = Object.entries(historicalMetricsByDate)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, values]) => ({ date, ...values }));

        return {
          slug,
          data: {
            name: entity.name,
            type: entity.type,
            history,
          },
        };
      } catch (error: any) {
        return { slug, error: error?.message || "Failed to fetch historical data" };
      }
    })
  );

  for (const result of results) {
    if ("error" in result && result.error) {
      errors[result.slug] = result.error;
    } else if ("data" in result && result.data) {
      data[result.slug] = result.data;
    }
  }

  return {
    success: true,
    timestamp: Math.floor(Date.now() / 1000),
    data,
    ...(Object.keys(errors).length > 0 ? { errors } : {}),
    meta: {
      requestedCount: entities.size,
      successCount: Object.keys(data).length,
      dateRange,
    },
  };
}

async function fetchCoinGeckoBatch(geckoIds: string[]): Promise<Record<string, any>> {
  const results: Record<string, any> = {};
  const uniqueIds = [...new Set(geckoIds.filter(Boolean))];

  await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const res = await fetch(`https://fe-cache.llama.fi/cgchart/${id}`);
        if (res.ok) {
          results[id] = await res.json();
        }
      } catch {
        results[id] = null;
      }
    })
  );

  return results;
}

function extractCGMetrics(cgData: any): { price: number | null; mcap: number | null; fdv: number | null } {
  if (!cgData?.data) {
    return { price: null, mcap: null, fdv: null };
  }

  const marketData = cgData.data?.coinData?.market_data;
  const prices = cgData.data?.prices;
  const mcaps = cgData.data?.mcaps;

  console.log("cgData", cgData.data);

  const price = marketData?.current_price?.usd ?? (prices?.length ? prices[prices.length - 1]?.[1] : null);
  const mcap = marketData?.market_cap?.usd ?? (mcaps?.length ? mcaps[mcaps.length - 1]?.[1] : null);
  const fdv = marketData?.fully_diluted_valuation?.usd ?? null;

  return { price, mcap, fdv };
}

async function fetchSupplyMetrics(): Promise<Record<string, any>> {
  try {
    const response = await getR2("emissionsSupplyMetrics");
    if (response?.body) {
      return JSON.parse(response.body);
    }
  } catch {}
  return {};
}

function calculateOFDV(supplyMetrics: Record<string, any>, slug: string, price: number | null): number | null {
  if (!price) return null;

  const protocolData = supplyMetrics?.[slug];
  if (!protocolData?.circulatingSupply) return null;

  return protocolData.circulatingSupply * price;
}

async function fetchStablecoinsChains(): Promise<any[]> {
  try {
    const res = await fetch("https://stablecoins.llama.fi/stablecoinchains");
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return [];
}

function getChainStablecoins(stablecoinChainsData: any[], chainName: string): number | null {
  const chainData = stablecoinChainsData.find(
    (c: any) =>
      c.name?.toLowerCase() === chainName.toLowerCase() || c.gecko_id?.toLowerCase() === chainName.toLowerCase()
  );
  return chainData?.totalCirculatingUSD?.peggedUSD ?? null;
}

async function fetchStablecoinsHistorical(chainName: string): Promise<[number, number][] | null> {
  try {
    const chainsData = await fetchStablecoinsChains();
    const chainData = chainsData.find(
      (c: any) =>
        c.name?.toLowerCase() === chainName.toLowerCase() || c.gecko_id?.toLowerCase() === chainName.toLowerCase()
    );

    const chainId = chainData?.gecko_id || chainName.toLowerCase();
    const res = await fetch(`https://stablecoins.llama.fi/stablecoincharts/${chainId}`);
    if (res.ok) {
      const data = await res.json();
      return data.map((item: any) => [item.date, item.totalCirculating?.peggedUSD ?? 0]);
    }
  } catch {}
  return null;
}

type DimensionType = "fees" | "dexs" | "derivatives";
type RecordType = "df" | "dr" | "dhr" | "dv";

const METRIC_TO_DIMENSION: Record<string, { adapterType: DimensionType; recordType: RecordType }> = {
  fees: { adapterType: "fees", recordType: "df" },
  revenue: { adapterType: "fees", recordType: "dr" },
  holdersRevenue: { adapterType: "fees", recordType: "dhr" },
  dexVolume: { adapterType: "dexs", recordType: "dv" },
  perpsVolume: { adapterType: "derivatives", recordType: "dv" },
};

async function fetchDimensionMetric(
  entity: ResolvedEntity,
  metricType: string,
  timeframe: Timeframe
): Promise<number | null> {
  const config = METRIC_TO_DIMENSION[metricType];
  if (!config) return null;

  const { adapterType, recordType } = config;
  const entityTypeFolder = entity.type === "protocol" ? "protocol" : "chain";
  const routePath = `dimensions/${adapterType}/${recordType}-${entityTypeFolder}/${entity.slug}-lite`;

  try {
    const data = await readRouteData(routePath, { skipErrorLog: true });
    if (!data) return null;

    const field = TIMEFRAME_FIELD_MAP[timeframe];
    return data[field] ?? null;
  } catch {
    return null;
  }
}

function getProtocolTvl(entity: ResolvedEntity): number | null {
  if (entity.type !== "protocol" || !entity.id) return null;

  //  direct protocol lookup
  const protocolData = cache.protocolSlugMap[entity.slug];
  if (protocolData) {
    const record = getLastHourlyRecord(protocolData);
    return record?.tvl ?? null;
  }

  //  parent protocol
  const parentData = cache.parentProtocolSlugMap[entity.slug];
  if (parentData) {
    const childProtocols = cache.childProtocols[parentData.id] ?? [];
    if (childProtocols.length > 0) {
      const tvl = childProtocols.reduce((acc: number, child: any) => {
        const record = getLastHourlyRecord(child);
        return acc + (record?.tvl ?? 0);
      }, 0);
      return isNaN(tvl) ? null : tvl;
    }
  }

  return null;
}

async function getChainTvl(chainName: string): Promise<number | null> {
  try {
    const chainsData = await readRouteData("v2/chains");
    if (!chainsData) return null;

    const chain = chainsData.find(
      (c: any) =>
        c.name?.toLowerCase() === chainName.toLowerCase() || c.gecko_id?.toLowerCase() === chainName.toLowerCase()
    );
    return chain?.tvl ?? null;
  } catch {
    return null;
  }
}

function getProtocolBorrows(entity: ResolvedEntity): number | null {
  if (entity.type !== "protocol" || !entity.id) return null;

  const tvlData = cache.tvlProtocol[entity.id];
  return tvlData?.borrowed?.total ?? tvlData?.borrowed ?? null;
}

async function assembleEntityMetrics(
  entity: ResolvedEntity,
  metrics: MetricType[],
  timeframe: Timeframe,
  sharedData: SharedData
): Promise<EntityMetrics> {
  const result: EntityMetrics = {
    name: entity.name,
    slug: entity.slug,
    type: entity.type,
    geckoId: entity.geckoId,
  };

  const errors: string[] = [];

  const cgData = entity.geckoId ? sharedData.cgDataMap[entity.geckoId] : null;
  const cgMetrics = extractCGMetrics(cgData);

  for (const metric of metrics) {
    try {
      switch (metric) {
        case "tvl":
          result.tvl = entity.type === "protocol" ? getProtocolTvl(entity) : await getChainTvl(entity.name);
          break;

        case "borrows":
          if (entity.type === "protocol") {
            result.borrows = getProtocolBorrows(entity);
          } else {
            result.borrows = null;
          }
          break;

        case "fees":
        case "revenue":
        case "holdersRevenue":
        case "dexVolume":
        case "perpsVolume":
          result[metric] = await fetchDimensionMetric(entity, metric, timeframe);
          break;

        case "mcap":
          result.mcap = cgMetrics.mcap;
          break;

        case "fdv":
          result.fdv = cgMetrics.fdv;
          break;

        case "price":
          result.price = cgMetrics.price;
          break;

        case "ofdv":
          result.ofdv = calculateOFDV(sharedData.supplyMetrics, entity.slug, cgMetrics.price);
          break;

        case "stablecoins":
          if (entity.type === "chain") {
            result.stablecoins = getChainStablecoins(sharedData.stablecoinChainsData, entity.name);
          } else {
            result.stablecoins = null;
          }
          break;
      }
    } catch (error: any) {
      result[metric] = null;
      errors.push(`${metric}: ${error?.message || "Unknown error"}`);
    }
  }

  if (errors.length > 0) {
    result.errors = errors;
  }

  return result;
}

function timestampToDateStr(timestamp: number): string {
  const ts = timestamp > 1e12 ? timestamp : timestamp * 1000;
  return new Date(ts).toISOString().split("T")[0];
}

function pickDateRangeValues(
  dataArray: [number, number][] | undefined,
  dateRange: { from: string; to: string }
): Record<string, number> {
  const result: Record<string, number> = {};
  if (!dataArray) return result;

  for (const [timestamp, value] of dataArray) {
    const date = timestampToDateStr(timestamp);
    if (date >= dateRange.from && date <= dateRange.to) {
      result[date] = value;
    }
  }
  return result;
}

async function fetchProtocolMiniData(slug: string): Promise<any> {
  try {
    const res = await fetch(`https://api.llama.fi/_fe/protocol-mini/${slug}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return null;
}

async function fetchDimensionHistoricalData(
  entity: ResolvedEntity,
  metricType: string
): Promise<[number, number][] | null> {
  const config = METRIC_TO_DIMENSION[metricType];
  if (!config) return null;

  const { adapterType, recordType } = config;
  const entityTypeFolder = entity.type === "protocol" ? "protocol" : "chain";
  const routePath = `dimensions/${adapterType}/${recordType}-${entityTypeFolder}/${entity.slug}-all`;

  try {
    const data = await readRouteData(routePath, { skipErrorLog: true });
    if (!data?.totalDataChart) return null;
    return data.totalDataChart;
  } catch {
    return null;
  }
}

async function fetchChainHistoricalTvl(chainName: string): Promise<[number, number][] | null> {
  try {
    const data = await readRouteData(`lite/charts/${chainName.toLowerCase()}`);
    if (!data) return null;
    return data.map((item: any) => [item[0], item[1]?.tvl ?? item[1]]);
  } catch {
    return null;
  }
}

export type MetricType =
  | "tvl"
  | "borrows"
  | "fees"
  | "revenue"
  | "holdersRevenue"
  | "dexVolume"
  | "perpsVolume"
  | "mcap"
  | "fdv"
  | "ofdv"
  | "price"
  | "stablecoins";

export type Timeframe = "24h" | "7d" | "30d" | "all";

const TIMEFRAME_FIELD_MAP: Record<Timeframe, string> = {
  "24h": "total24h",
  "7d": "total7d",
  "30d": "total30d",
  "all": "total",
};

export interface EntityMetrics {
  name: string;
  slug: string;
  type: "protocol" | "chain";
  tvl?: number | null;
  borrows?: number | null;
  fees?: number | null;
  revenue?: number | null;
  holdersRevenue?: number | null;
  dexVolume?: number | null;
  perpsVolume?: number | null;
  mcap?: number | null;
  fdv?: number | null;
  ofdv?: number | null;
  price?: number | null;
  stablecoins?: number | null;
  geckoId?: string | null;
  errors?: string[];
}

export interface BatchCurrentResponse {
  success: boolean;
  timestamp: number;
  data: Record<string, EntityMetrics>;
  errors?: Record<string, string>;
  meta: {
    requestedCount: number;
    successCount: number;
    timeframe: Timeframe;
  };
}

interface HistoricalDataPoint {
  date: string;
  [metric: string]: number | string | null;
}

export interface BatchHistoricalResponse {
  success: boolean;
  timestamp: number;
  data: Record<
    string,
    {
      name: string;
      type: "protocol" | "chain";
      history: HistoricalDataPoint[];
    }
  >;
  errors?: Record<string, string>;
  meta: {
    requestedCount: number;
    successCount: number;
    dateRange: { from: string; to: string };
  };
}

interface SharedData {
  cgDataMap: Record<string, any>;
  supplyMetrics: Record<string, any>;
  stablecoinsData: Record<string, any>;
  stablecoinChainsData: any[];
}
