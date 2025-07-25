export function excludeProtocolInCharts(category: string, includeBridge?: boolean) {
  let exclude = false

  if (excludedCategoriesSet.has(category))
    return true

  if (!includeBridge)
    exclude = tvlExcludedBridgeCategoriesSet.has(category)

  return exclude;
}

const excludedCategoriesSet = new Set(['Chain', 'CEX', 'Infrastructure', 'Staking Pool', 'RWA', 'Basis Trading', 'CeDeFi'])  // protocols with these categories are excluded from overall/chain tvl charts

export const tvlExcludedBridgeCategoriesSet = new Set(['Bridge', 'Canonical Bridge'])  // list of bridge categories that are excluded from TVL charts by default
export const bridgeCategoriesSet = new Set(['Bridge', 'Cross Chain Bridge', 'Canonical Bridge'])  // this is used in appMetadata.ts for setting bridge flag, used no where else

export const hiddenCategoriesFromUISet = new Set(["Chain", "CEX"]) // hide these categories on defillama.com/categories page
export const hiddenCategoriesFromProtocolsListSet = new Set(["Chain", "CEX", 'Bridge', 'Canonical Bridge']) // hide protocols with these categories on defillama.com home page , api.llama.fi/lite/protocols2 endpoint
