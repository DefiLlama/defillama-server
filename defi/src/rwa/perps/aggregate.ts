import { toStringArrayOrNull, toStringOrNull } from "../utils";
import { UNKNOWN_PERPS_ASSET_GROUP, normalizePerpsAssetGroup } from "./server-helpers";
import { perpsSlug, toFiniteNumberOrZero } from "./utils";

type MetadataPayload = {
  contract?: unknown;
  venue?: unknown;
  referenceAsset?: unknown;
  referenceAssetGroup?: unknown;
  assetClass?: unknown;
  category?: unknown;
};

type MetadataRecord = {
  id: string;
  data?: MetadataPayload;
};

type DailyRecord = {
  id: string;
  timestamp: number;
  open_interest: number | string | null;
  volume_24h: number | string | null;
};

export type AggregateHistoricalRow = {
  timestamp: number;
  id: string;
  contract: string;
  venue: string;
  referenceAsset: string | null;
  referenceAssetGroup: string | null;
  assetClass: string[] | null;
  category: string[];
  openInterest: number;
  volume24h: number;
};

export type PerpsChartMetricKey = "openInterest" | "volume24h" | "markets";
export type PerpsOverviewBreakdown = "venue" | "assetGroup" | "assetClass" | "baseAsset";
export type PerpsBreakdownChartRow = { timestamp: number } & Record<string, number>;

const BREAKDOWN_METRIC_KEYS: PerpsChartMetricKey[] = ["openInterest", "volume24h", "markets"];
const OVERVIEW_BREAKDOWNS_BY_TARGET = {
  all: ["venue", "assetGroup", "assetClass", "baseAsset"],
  venue: ["assetGroup", "assetClass", "baseAsset"],
  assetGroup: ["venue", "assetClass", "baseAsset"],
} satisfies Record<"all" | "venue" | "assetGroup", PerpsOverviewBreakdown[]>;

function getMetadataMap(metadata: MetadataRecord[]) {
  const metadataMap = new Map<string, MetadataPayload>();
  for (const entry of metadata) {
    if (entry?.id) {
      metadataMap.set(entry.id, entry.data ?? {});
    }
  }
  return metadataMap;
}

function normalizeCategoryList(value: unknown): string[] {
  return toStringArrayOrNull(value) ?? [];
}

function getContractLabel(row: Pick<AggregateHistoricalRow, "contract" | "id">): string {
  return toStringOrNull(row.contract) || row.id;
}

function getBaseAssetLabel(row: Pick<AggregateHistoricalRow, "contract" | "id" | "referenceAsset">): string {
  const contract = getContractLabel(row);
  return toStringOrNull(row.referenceAsset) || contract.split(":")[1] || contract;
}

function getAssetClassLabel(row: Pick<AggregateHistoricalRow, "assetClass">): string {
  return row.assetClass?.[0] ?? UNKNOWN_PERPS_ASSET_GROUP;
}

function getAssetGroupLabel(row: Pick<AggregateHistoricalRow, "referenceAssetGroup">): string {
  return normalizePerpsAssetGroup(row.referenceAssetGroup);
}

function buildBaseHistoricalRow(record: DailyRecord, metadataMap: Map<string, MetadataPayload>): AggregateHistoricalRow {
  const metadata = metadataMap.get(record.id) ?? {};
  return {
    timestamp: record.timestamp,
    id: record.id,
    contract: toStringOrNull(metadata.contract) || record.id,
    venue: toStringOrNull(metadata.venue) || record.id.split(":")[0] || "unknown",
    referenceAsset: toStringOrNull(metadata.referenceAsset),
    referenceAssetGroup: toStringOrNull(metadata.referenceAssetGroup),
    assetClass: toStringArrayOrNull(metadata.assetClass),
    category: normalizeCategoryList(metadata.category),
    openInterest: toFiniteNumberOrZero(record.open_interest),
    volume24h: toFiniteNumberOrZero(record.volume_24h),
  };
}

function buildHistoricalRows(dailyRecords: DailyRecord[], metadata: MetadataRecord[]): AggregateHistoricalRow[] {
  const metadataMap = getMetadataMap(metadata);
  return dailyRecords.map((record) => buildBaseHistoricalRow(record, metadataMap));
}

function sortHistoricalRows(rows: AggregateHistoricalRow[]) {
  rows.sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
  return rows;
}

function sortHistoricalChartRows<T extends { timestamp: number; id?: string }>(rows: T[]): T[] {
  rows.sort((a, b) => a.timestamp - b.timestamp || String(a.id ?? "").localeCompare(String(b.id ?? "")));
  return rows;
}

function sortBreakdownChartRows(rows: PerpsBreakdownChartRow[]) {
  rows.sort((a, b) => a.timestamp - b.timestamp);
  return rows;
}

export function mergeUpdatedHistoricalChartRows<T extends { timestamp: number; id?: string }>(
  existingRows: T[] | null,
  updatedRows: T[],
  updatedTimestamps?: number[]
): T[] {
  if (!existingRows || existingRows.length === 0) return sortHistoricalChartRows([...updatedRows]);

  const timestamps = updatedTimestamps ?? updatedRows.map((row) => Number(row.timestamp));
  const updatedTimestampSet = new Set(timestamps.filter(Number.isFinite));
  if (updatedTimestampSet.size === 0) return sortHistoricalChartRows([...existingRows]);

  const retainedRows = existingRows.filter((row) => !updatedTimestampSet.has(Number(row.timestamp)));
  return sortHistoricalChartRows([...retainedRows, ...updatedRows]);
}

function getMetricValue(row: AggregateHistoricalRow, key: PerpsChartMetricKey): number {
  if (key === "markets") return 1;
  return toFiniteNumberOrZero(row[key]);
}

function hasPerpsBreakdownData(row: AggregateHistoricalRow): boolean {
  return row.openInterest !== 0 || row.volume24h !== 0;
}

function toOverviewSeriesLabel(row: AggregateHistoricalRow, breakdown: PerpsOverviewBreakdown): string {
  switch (breakdown) {
    case "venue":
      return row.venue || "unknown";
    case "assetGroup":
      return getAssetGroupLabel(row);
    case "assetClass":
      return getAssetClassLabel(row);
    case "baseAsset":
      return getBaseAssetLabel(row);
    default:
      return row.venue || "unknown";
  }
}

function buildBreakdownChartRows(
  rows: AggregateHistoricalRow[],
  key: PerpsChartMetricKey,
  getSeriesLabel: (row: AggregateHistoricalRow) => string
): PerpsBreakdownChartRow[] {
  const byTimestamp = new Map<number, PerpsBreakdownChartRow>();
  const startedSeries = new Set<string>();

  for (const row of rows) {
    const timestamp = Number(row.timestamp);
    if (!Number.isFinite(timestamp)) continue;

    const seriesLabel = String(getSeriesLabel(row) || UNKNOWN_PERPS_ASSET_GROUP);
    const metricValue = getMetricValue(row, key);
    if (!Number.isFinite(metricValue)) continue;
    if (key === "markets" || hasPerpsBreakdownData(row)) {
      startedSeries.add(seriesLabel);
    } else if (!startedSeries.has(seriesLabel)) {
      continue;
    }

    const existing = byTimestamp.get(timestamp) ?? { timestamp };
    existing[seriesLabel] = (existing[seriesLabel] ?? 0) + metricValue;
    byTimestamp.set(timestamp, existing);
  }

  return sortBreakdownChartRows(Array.from(byTimestamp.values()));
}

function buildGroupMap(
  rows: AggregateHistoricalRow[],
  getGroupSlug: (row: AggregateHistoricalRow) => string
): Record<string, AggregateHistoricalRow[]> {
  const grouped: Record<string, AggregateHistoricalRow[]> = {};

  for (const row of rows) {
    const slug = getGroupSlug(row);
    if (!grouped[slug]) grouped[slug] = [];
    grouped[slug].push(row);
  }

  return grouped;
}

export function buildPerpsIdMap(metadata: MetadataRecord[]): Record<string, string> {
  const idMap: Record<string, string> = {};

  for (const entry of metadata) {
    const id = entry?.id ? String(entry.id).toLowerCase() : "";
    const contract = entry?.data?.contract ? String(entry.data.contract).toLowerCase() : "";
    const venue = entry?.data?.venue ? String(entry.data.venue).toLowerCase() : "";
    const sluggedId = id ? perpsSlug(id) : "";
    const sluggedContract = contract ? perpsSlug(contract) : "";

    if (id) {
      idMap[id] = id;
    }
    if (sluggedId) {
      idMap[sluggedId] = id || sluggedId;
    }

    if (contract) {
      idMap[contract] = id || contract;
    }
    if (sluggedContract) {
      idMap[sluggedContract] = id || contract;
    }

    if (contract && venue) {
      const venuePrefixedContract = contract.startsWith(`${venue}:`) ? contract : `${venue}:${contract}`;
      const sluggedVenuePrefixedContract = perpsSlug(venuePrefixedContract);
      idMap[venuePrefixedContract] = id || contract;
      idMap[sluggedVenuePrefixedContract] = id || contract;
    }
  }

  return idMap;
}

export function buildVenueHistoricalCharts(
  dailyRecords: DailyRecord[],
  metadata: MetadataRecord[]
): Record<string, AggregateHistoricalRow[]> {
  const chartsByVenue = buildGroupMap(buildHistoricalRows(dailyRecords, metadata), (row) => perpsSlug(row.venue));

  for (const venueKey in chartsByVenue) {
    sortHistoricalRows(chartsByVenue[venueKey]);
  }

  return chartsByVenue;
}

export function buildCategoryHistoricalCharts(
  dailyRecords: DailyRecord[],
  metadata: MetadataRecord[]
): Record<string, AggregateHistoricalRow[]> {
  const rows = buildHistoricalRows(dailyRecords, metadata);
  const chartsByCategory: Record<string, AggregateHistoricalRow[]> = {};

  for (const row of rows) {
    const categories = row.category.length > 0 ? row.category : ["Other"];

    for (const category of categories) {
      const key = perpsSlug(category);
      if (!chartsByCategory[key]) chartsByCategory[key] = [];
      chartsByCategory[key].push({
        ...row,
        category: [category],
      });
    }
  }

  for (const categoryKey in chartsByCategory) {
    sortHistoricalRows(chartsByCategory[categoryKey]);
  }

  return chartsByCategory;
}

export function buildOverviewBreakdownCharts(
  dailyRecords: DailyRecord[],
  metadata: MetadataRecord[]
): Record<string, PerpsBreakdownChartRow[]> {
  const rows = buildHistoricalRows(dailyRecords, metadata);
  const charts: Record<string, PerpsBreakdownChartRow[]> = {};
  const rowsByVenue = buildGroupMap(rows, (row) => perpsSlug(row.venue));
  const rowsByAssetGroup = buildGroupMap(rows, (row) => perpsSlug(getAssetGroupLabel(row)));

  for (const metric of BREAKDOWN_METRIC_KEYS) {
    for (const breakdown of OVERVIEW_BREAKDOWNS_BY_TARGET.all) {
      charts[`overview-breakdown/all/${metric.toLowerCase()}/${breakdown.toLowerCase()}.json`] =
        buildBreakdownChartRows(rows, metric, (row) => toOverviewSeriesLabel(row, breakdown));
    }
  }

  for (const venueSlug in rowsByVenue) {
    const venueRows = rowsByVenue[venueSlug];
    for (const metric of BREAKDOWN_METRIC_KEYS) {
      for (const breakdown of OVERVIEW_BREAKDOWNS_BY_TARGET.venue) {
        charts[`overview-breakdown/venue/${venueSlug}/${metric.toLowerCase()}/${breakdown.toLowerCase()}.json`] =
          buildBreakdownChartRows(venueRows, metric, (row) => toOverviewSeriesLabel(row, breakdown));
      }
    }
  }

  for (const assetGroupSlug in rowsByAssetGroup) {
    const assetGroupRows = rowsByAssetGroup[assetGroupSlug];
    for (const metric of BREAKDOWN_METRIC_KEYS) {
      for (const breakdown of OVERVIEW_BREAKDOWNS_BY_TARGET.assetGroup) {
        charts[`overview-breakdown/assetgroup/${assetGroupSlug}/${metric.toLowerCase()}/${breakdown.toLowerCase()}.json`] =
          buildBreakdownChartRows(assetGroupRows, metric, (row) => toOverviewSeriesLabel(row, breakdown));
      }
    }
  }

  return charts;
}

export function buildContractBreakdownCharts(
  dailyRecords: DailyRecord[],
  metadata: MetadataRecord[]
): Record<string, PerpsBreakdownChartRow[]> {
  const rows = buildHistoricalRows(dailyRecords, metadata);
  const charts: Record<string, PerpsBreakdownChartRow[]> = {};
  const rowsByVenue = buildGroupMap(rows, (row) => perpsSlug(row.venue));
  const rowsByAssetGroup = buildGroupMap(rows, (row) => perpsSlug(getAssetGroupLabel(row)));

  for (const metric of BREAKDOWN_METRIC_KEYS) {
    charts[`contract-breakdown/all/${metric.toLowerCase()}.json`] = buildBreakdownChartRows(
      rows,
      metric,
      getContractLabel
    );
  }

  for (const venueSlug in rowsByVenue) {
    const venueRows = rowsByVenue[venueSlug];
    for (const metric of BREAKDOWN_METRIC_KEYS) {
      charts[`contract-breakdown/venue/${venueSlug}/${metric.toLowerCase()}.json`] = buildBreakdownChartRows(
        venueRows,
        metric,
        getContractLabel
      );
    }
  }

  for (const assetGroupSlug in rowsByAssetGroup) {
    const assetGroupRows = rowsByAssetGroup[assetGroupSlug];
    for (const metric of BREAKDOWN_METRIC_KEYS) {
      charts[`contract-breakdown/assetgroup/${assetGroupSlug}/${metric.toLowerCase()}.json`] = buildBreakdownChartRows(
        assetGroupRows,
        metric,
        getContractLabel
      );
    }
  }

  return charts;
}
