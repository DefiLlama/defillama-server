import { Protocol } from "../protocols/data";

export function excludeProtocolInCharts(protocol: Protocol, includeBridge?: boolean) {
    let exclude = false;
    const excludedCategories = ['Chain', 'CEX', 'Infrastructure', 'Staking Pool']
  
    if (excludedCategories.includes(protocol.category!)) {
      return true;
    }
  
    if (!includeBridge) {
      exclude = protocol.name === "AnySwap" || protocol.category === "Bridge";
    }
  
    return exclude;
  }
  
export function isExcludedFromChainTvl(category?: string) {
  return category === "RWA" || category === "Basis Trading" || category === "CeDeFi";
}

export const includeCategoryIntoChainTvl = (category?:string)=>{
  if(category === undefined) return true
  return !["Bridge", "RWA", "Basis Trading", "CeDeFi"].includes(category)
}