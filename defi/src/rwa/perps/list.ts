import { normalizePerpsAssetGroup } from "./server-helpers";
import { toFiniteNumberOrZero } from "./utils";

interface PerpsListMarket {
  contract?: unknown;
  venue?: unknown;
  category?: unknown;
  referenceAssetGroup?: unknown;
  openInterest?: unknown;
}

interface PerpsListResponse {
  contracts: string[];
  venues: string[];
  categories: string[];
  assetGroups: string[];
  total: number;
}

function sortMetricEntriesDesc(metricMap: Record<string, number>): string[] {
  return Object.entries(metricMap)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key]) => key);
}

export function buildPerpsList(currentData: PerpsListMarket[]): PerpsListResponse {
  const contractOpenInterest: Record<string, number> = {};
  const venueOpenInterest: Record<string, number> = {};
  const categoryOpenInterest: Record<string, number> = {};
  const assetGroupOpenInterest: Record<string, number> = {};

  for (const market of currentData) {
    const openInterest = toFiniteNumberOrZero(market.openInterest);

    if (market.contract) {
      const contract = String(market.contract);
      contractOpenInterest[contract] = (contractOpenInterest[contract] || 0) + openInterest;
    }

    const venue = typeof market.venue === "string" && market.venue.trim() ? market.venue : "unknown";
    venueOpenInterest[venue] = (venueOpenInterest[venue] || 0) + openInterest;

    const categories = Array.isArray(market.category) ? market.category : [market.category || "Other"];
    for (const category of categories) {
      const categoryLabel = String(category);
      categoryOpenInterest[categoryLabel] = (categoryOpenInterest[categoryLabel] || 0) + openInterest;
    }

    const assetGroup = normalizePerpsAssetGroup(market.referenceAssetGroup);
    assetGroupOpenInterest[assetGroup] = (assetGroupOpenInterest[assetGroup] || 0) + openInterest;
  }

  return {
    contracts: sortMetricEntriesDesc(contractOpenInterest),
    venues: sortMetricEntriesDesc(venueOpenInterest),
    categories: sortMetricEntriesDesc(categoryOpenInterest),
    assetGroups: sortMetricEntriesDesc(assetGroupOpenInterest),
    total: currentData.length,
  };
}
