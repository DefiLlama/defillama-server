import { Protocol } from "../protocols/data";

const excludedCategoriesSet = new Set(['Chain', 'CEX', 'Infrastructure', 'Staking Pool', 'Canonical Bridge'])

export function excludeProtocolInCharts(protocol: Protocol, includeBridge?: boolean) {
  let exclude = false;

  if (excludedCategoriesSet.has(protocol.category!)) {
    return true;
  }

  if (!includeBridge) {
    exclude = protocol.name === "AnySwap" || protocol.category === "Bridge";
  }

  return exclude;
}

const excludedChainTvlCategoriesSet = new Set(['RWA', 'Basis Trading', 'CeDeFi',])

export function isExcludedFromChainTvl(category?: string) {
  return excludedChainTvlCategoriesSet.has(category as string);
}

const excludedChainTvlCategoriesSet2 = new Set(['RWA', 'Basis Trading', 'CeDeFi', 'Canonical Bridge', "Bridge",])
export const includeCategoryIntoChainTvl = (category?: string) => {
  if (category === undefined) return true
  return !excludedChainTvlCategoriesSet2.has(category as string);
}