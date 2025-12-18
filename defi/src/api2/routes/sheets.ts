import * as HyperExpress from "hyper-express";
import { errorResponse, successResponse } from "./utils";
import { resolveEntities } from "../utils/entityResolver";
import { fetchMetrics, fetchHistoricalMetrics, MetricType, Timeframe } from "../utils/sheetsMetrics";

const ALL_METRICS: MetricType[] = [
  "tvl",
  "borrows",
  "fees",
  "revenue",
  "holdersRevenue",
  "dexVolume",
  "perpsVolume",
  "mcap",
  "fdv",
  "ofdv",
  "price",
];

const VALID_METRICS = new Set<string>([...ALL_METRICS, "stablecoins"]);

const HISTORICAL_METRICS: MetricType[] = [
  "tvl",
  "borrows",
  "fees",
  "revenue",
  "holdersRevenue",
  "dexVolume",
  "perpsVolume",
  "mcap",
  "fdv",
  "price",
  "stablecoins",
];

const VALID_TIMEFRAMES = new Set<string>(["24h", "7d", "30d", "all"]);

const MAX_ENTITIES = 5;

export async function getSheetsData(req: HyperExpress.Request, res: HyperExpress.Response) {
  const params = req.query_parameters;

  const entitiesParam = params.entities;
  if (!entitiesParam) {
    return "entities query parameter is required";
  }

  const entityNames = entitiesParam
    .split(",")
    .map((input) => input.trim())
    .filter(Boolean);
  if (entityNames.length === 0) {
    return "entities must contain at least one valid string";
  }

  if (entityNames.length > MAX_ENTITIES) {
    return `Maximum ${MAX_ENTITIES} entities allowed per request`;
  }

  const metricsParam = params.metrics ? params.metrics.split(",").map((m: string) => m.trim()) : undefined;
  const metrics = validateMetrics(metricsParam);

  if (!metrics) {
    return `Invalid metrics. Valid values: ${[...VALID_METRICS].join(", ")}`;
  }

  const timeframe = validateTimeframe(params.timeframe);

  const resolvedEntities = await resolveEntities(entityNames);

  const result = await fetchMetrics(resolvedEntities, metrics, timeframe);

  return successResponse(res, result, 10);
}

export async function getSheetsHistoricalData(req: HyperExpress.Request, res: HyperExpress.Response) {
  const params = req.query_parameters;

  // Validate entities
  const entitiesParam = params.entities;
  if (!entitiesParam) {
    return errorResponse(res, "entities query parameter is required", { statusCode: 400 });
  }

  const entityNames = entitiesParam
    .split(",")
    .map((e: string) => e.trim())
    .filter((e: string) => e.length > 0);
  if (entityNames.length === 0) {
    return errorResponse(res, "entities must contain at least one valid string", { statusCode: 400 });
  }

  if (entityNames.length > MAX_ENTITIES) {
    return errorResponse(res, `Maximum ${MAX_ENTITIES} entities allowed per request for historical data`, {
      statusCode: 400,
    });
  }

  const metricsParam = params.metrics ? params.metrics.split(",").map((m: string) => m.trim()) : undefined;
  const metrics = validateMetrics(metricsParam);
  const historicalMetrics = metrics?.filter((m) => HISTORICAL_METRICS.includes(m));
  if (!metrics || historicalMetrics?.length === 0) {
    return errorResponse(res, `Invalid metrics. Historical data supports: ${HISTORICAL_METRICS.join(", ")}`, {
      statusCode: 400,
    });
  }

  const dateRange = validateDateRangeFromParams(params);
  if (!dateRange) {
    return errorResponse(res, "date (YYYY-MM-DD) or from/to query parameters are required", {
      statusCode: 400,
    });
  }

  const resolvedEntities = await resolveEntities(entityNames);

  const result = await fetchHistoricalMetrics(resolvedEntities, metrics, dateRange);

  return successResponse(res, result, 60);
}

function validateMetrics(metrics: any): MetricType[] | null {
  if (!metrics) return ALL_METRICS;
  if (!Array.isArray(metrics)) return null;

  const validMetrics: MetricType[] = [];
  for (const metric of metrics) {
    if (VALID_METRICS.has(metric)) {
      validMetrics.push(metric as MetricType);
    }
  }

  return validMetrics.length > 0 ? validMetrics : null;
}

function validateTimeframe(timeframe: any): Timeframe {
  if (timeframe && VALID_TIMEFRAMES.has(timeframe)) {
    return timeframe as Timeframe;
  }
  return "24h";
}

function validateDateRangeFromParams(params: Record<string, string>): { from: string; to: string } | null {
  const { date, from, to } = params;

  if (date) {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return null;
    const dateStr = parsed.toISOString().split("T")[0];
    return { from: dateStr, to: dateStr };
  }

  if (from && to) {
    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return null;
    if (fromDate > toDate) return null;

    return {
      from: fromDate.toISOString().split("T")[0],
      to: toDate.toISOString().split("T")[0],
    };
  }

  return null;
}
