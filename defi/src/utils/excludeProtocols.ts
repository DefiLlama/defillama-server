export function excludeProtocolInCharts(category: string, includeBridge?: boolean) {
  let exclude = false

  if (excludedCategoriesSet.has(category))
    return true

  if (!includeBridge)
    exclude = tvlExcludedBridgeCategoriesSet.has(category)

  return exclude;
}

const excludedCategoriesSet = new Set(['Chain', 'CEX', 'Infrastructure', 'Staking Pool', 'RWA', 'Basis Trading', 'CeDeFi',])  // protocols with these categories are excluded from overall/chain tvl charts
const excludedChainTvlCategoriesSet2 = new Set(['RWA', 'Basis Trading', 'CeDeFi', 'Canonical Bridge', "Bridge",])

export const tvlExcludedBridgeCategoriesSet = new Set(['Bridge', 'Canonical Bridge'])  // list of bridge categories that are excluded from TVL charts by default
export const bridgeCategoriesSet = new Set(['Bridge', 'Cross Chain Bridge', 'Canonical Bridge'])  // this is used in appMetadata.ts for setting bridge flag, used no where else


// I am kinda lost as to why this is used instead of excludeProtocolInCharts
export const includeCategoryIntoChainTvl = (category?: string) => {
  if (category === undefined) return true
  return !excludedChainTvlCategoriesSet2.has(category as string);
}