import { perpsSlug } from "./utils";

export const UNKNOWN_PERPS_ASSET_GROUP = "Unknown";

export type PerpsChartMetricKey = "openInterest" | "volume24h" | "markets";
export type PerpsOverviewBreakdown = "venue" | "assetGroup" | "assetClass" | "baseAsset";
export type PerpsChartTarget =
  | { kind: "all" }
  | { kind: "venue"; slug: string }
  | { kind: "assetGroup"; slug: string };

const OVERVIEW_BREAKDOWNS_BY_TARGET = {
  all: new Set<PerpsOverviewBreakdown>(["venue", "assetGroup", "assetClass", "baseAsset"]),
  venue: new Set<PerpsOverviewBreakdown>(["assetGroup", "assetClass", "baseAsset"]),
  assetGroup: new Set<PerpsOverviewBreakdown>(["venue", "assetClass", "baseAsset"]),
};

export function normalizePerpsAssetGroup(value: unknown): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || UNKNOWN_PERPS_ASSET_GROUP;
}

export function resolvePerpsLookupId(idMap: Record<string, string> | null | undefined, input: string): string | null {
  if (!input) return null;

  const normalizedInput = String(input).toLowerCase();
  if (idMap?.[normalizedInput]) return idMap[normalizedInput];

  const sluggedInput = perpsSlug(input);
  if (sluggedInput && idMap?.[sluggedInput]) return idMap[sluggedInput];

  return normalizedInput;
}

export function findMarketById(currentData: any[], id: string) {
  const idParam = String(id).toLowerCase();
  return currentData.find((item: any) =>
    typeof item?.id !== "undefined" && String(item.id).toLowerCase() === idParam
  );
}

export function sortPerpsMarketsByOpenInterest(currentData: any[]): any[] {
  return [...currentData].sort((a: any, b: any) => {
    const openInterestDiff = Number(b?.openInterest || 0) - Number(a?.openInterest || 0);
    if (openInterestDiff !== 0) return openInterestDiff;

    const contractDiff = String(a?.contract || "").localeCompare(String(b?.contract || ""));
    if (contractDiff !== 0) return contractDiff;

    const venueDiff = String(a?.venue || "").localeCompare(String(b?.venue || ""));
    if (venueDiff !== 0) return venueDiff;

    return String(a?.id || "").localeCompare(String(b?.id || ""));
  });
}

export function findMarketsByContract(currentData: any[], contract: string): any[] {
  const contractSlug = perpsSlug(contract);
  return currentData.filter((item: any) =>
    typeof item?.contract !== "undefined" && perpsSlug(item.contract) === contractSlug
  );
}

export function findMarketsByVenue(currentData: any[], venue: string): any[] {
  const venueSlug = perpsSlug(venue);
  return currentData.filter((item: any) => perpsSlug(item.venue) === venueSlug);
}

export function findMarketsByCategory(currentData: any[], category: string): any[] {
  const slugCategory = perpsSlug(category);
  return currentData.filter((item: any) => {
    const categories = Array.isArray(item.category) ? item.category : [item.category || "Other"];
    return categories.some((cat: string) => perpsSlug(cat) === slugCategory);
  });
}

export function findMarketsByAssetGroup(currentData: any[], assetGroup: string): any[] {
  const assetGroupSlug = perpsSlug(assetGroup);
  return currentData.filter((item: any) => {
    const normalizedAssetGroup = normalizePerpsAssetGroup(item.referenceAssetGroup);
    return perpsSlug(normalizedAssetGroup) === assetGroupSlug;
  });
}

function normalizeTargetParam(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return perpsSlug(trimmed);
}

function buildTargetPath(target: PerpsChartTarget): string {
  switch (target.kind) {
    case "all":
      return "all";
    case "venue":
      return `venue/${target.slug}`;
    case "assetGroup":
      return `assetgroup/${target.slug}`;
    default:
      return "all";
  }
}

export function parsePerpsChartTarget(params: {
  venue?: unknown;
  assetGroup?: unknown;
}): PerpsChartTarget | null {
  const venueSlug = normalizeTargetParam(params.venue);
  const assetGroupSlug = normalizeTargetParam(params.assetGroup);

  if (venueSlug && assetGroupSlug) return null;
  if (venueSlug) return { kind: "venue", slug: venueSlug };
  if (assetGroupSlug) return { kind: "assetGroup", slug: assetGroupSlug };
  return { kind: "all" };
}

function isPerpsChartMetricKey(value: unknown): value is PerpsChartMetricKey {
  return value === "openInterest" || value === "volume24h" || value === "markets";
}

export function getPerpsOverviewBreakdownFilePath(params: {
  target: PerpsChartTarget;
  key: unknown;
  breakdown: unknown;
}): string | null {
  if (!isPerpsChartMetricKey(params.key)) return null;
  if (typeof params.breakdown !== "string") return null;

  const allowedBreakdowns = OVERVIEW_BREAKDOWNS_BY_TARGET[params.target.kind];
  if (!allowedBreakdowns.has(params.breakdown as PerpsOverviewBreakdown)) return null;

  return `charts/overview-breakdown/${buildTargetPath(params.target)}/${params.key.toLowerCase()}/${params.breakdown.toLowerCase()}.json`;
}

export function getPerpsContractBreakdownFilePath(params: {
  target: PerpsChartTarget;
  key: unknown;
}): string | null {
  if (!isPerpsChartMetricKey(params.key)) return null;
  return `charts/contract-breakdown/${buildTargetPath(params.target)}/${params.key.toLowerCase()}.json`;
}
