import { Protocol } from "../protocols/data";

const excludedCategoriesSet = new Set(['Chain', 'CEX', 'Infrastructure', 'Staking Pool'])

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
  
const excludedChainTvlCategoriesSet = new Set([ 'RWA', 'Basis Trading', 'CeDeFi', ])

export function isExcludedFromChainTvl(category?: string) {
  return excludedChainTvlCategoriesSet.has(category as string);
}

export const includeCategoryIntoChainTvl = (category?:string)=>{
  if(category === undefined) return true
  return !["Bridge", "RWA", "Basis Trading", "CeDeFi"].includes(category)
}