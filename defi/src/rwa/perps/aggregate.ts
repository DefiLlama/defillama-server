import { perpsSlug, toFiniteNumberOrZero } from "./utils";
import { toStringArrayOrNull, toStringOrNull } from "../utils";

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

function sortHistoricalRows(rows: AggregateHistoricalRow[]) {
  rows.sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
  return rows;
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
  const metadataMap = getMetadataMap(metadata);
  const chartsByVenue: Record<string, AggregateHistoricalRow[]> = {};

  for (const record of dailyRecords) {
    const row = buildBaseHistoricalRow(record, metadataMap);
    const key = perpsSlug(row.venue);
    if (!chartsByVenue[key]) chartsByVenue[key] = [];
    chartsByVenue[key].push(row);
  }

  for (const rows of Object.values(chartsByVenue)) {
    sortHistoricalRows(rows);
  }

  return chartsByVenue;
}

export function buildCategoryHistoricalCharts(
  dailyRecords: DailyRecord[],
  metadata: MetadataRecord[]
): Record<string, AggregateHistoricalRow[]> {
  const metadataMap = getMetadataMap(metadata);
  const chartsByCategory: Record<string, AggregateHistoricalRow[]> = {};

  for (const record of dailyRecords) {
    const row = buildBaseHistoricalRow(record, metadataMap);
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

  for (const rows of Object.values(chartsByCategory)) {
    sortHistoricalRows(rows);
  }

  return chartsByCategory;
}
