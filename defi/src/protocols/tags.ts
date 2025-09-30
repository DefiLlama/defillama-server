
import type { Protocol } from "./types";

export const CategoryTagMap = {
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
    "Private Equity",
    "Tokenized Trading Strategies"
  ],
}

export const TagCatetgoryMap: Record<string, string> = {}

Object.entries(CategoryTagMap).forEach(([category, tags]) => {
  tags.forEach((tag) => {
    TagCatetgoryMap[tag] = category
  })
})

export function setProtocolCategory(protocol: Protocol): string | undefined {
  if (protocol.category) return;
  const tags = protocol.tags || []
  if (!tags.length) {
    console.error(`Protocol ${protocol.name} has no tags or category`);
    return;
  }
  const firstTag = tags[0]
  if (!TagCatetgoryMap[firstTag]) {
    console.error(`Protocol ${protocol.name} has unknown tag ${firstTag}`);
    return;
  }
  protocol.category = TagCatetgoryMap[firstTag]
}