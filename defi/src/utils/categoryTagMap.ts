// categoryTagMap.ts

// Static export (as requested)
export const categoryTagMap = {
  RWA: [
    "Treasury Bills",
    "Private Credit",
    "Carbon Credits",
    "Real Estate",
    "Other Fixed Income",
    "Crowdfunding",
    "Onchain Equity",
    "Stocks & ETFs",
    "Money Market Funds",
    "Commodities",
    "Collectibles",
    "Hedge Funds",
    "Private Equity"
  ],
  // add more categories here in future
} as const;

// --- Internal Utilities ---

// Create a mutable copy for manipulation
const mutableMap: { [K in keyof typeof categoryTagMap]: string[] } = 
  JSON.parse(JSON.stringify(categoryTagMap));

export type Category = keyof typeof categoryTagMap;
export type Tag = string;

// Add new tags to existing or new categories
export function addCategoryTags(category: string, tags: string[]): void {
  if (!mutableMap[category as keyof typeof mutableMap]) {
    (mutableMap as any)[category] = [];
  }

  const currentTags = mutableMap[category as keyof typeof mutableMap];
  for (const tag of tags) {
    if (!currentTags.includes(tag)) {
      currentTags.push(tag);
    }
  }
}

// Export the current map as JSON string
export function exportCategoryTagMap(pretty: boolean = true): string {
  return JSON.stringify(mutableMap, null, pretty ? 2 : 0);
}

// Optional: get the current mutable state (readonly)
export function getCategoryTagMap(): Readonly<typeof mutableMap> {
  return mutableMap;
}
