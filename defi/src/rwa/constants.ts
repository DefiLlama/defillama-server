import protocols from "../protocols/data";
import entities from "../protocols/entities";
import treasuries from "../protocols/treasury";

export const excludedProtocolCategories: string[] = ["CEX"];

export const unsupportedChains: string[] = [];


export const protocolIdMap: { [id: string]: string } = {};
export const categoryMap: { [category: string]: string } = {};
[...protocols, ...entities, ...treasuries].map((protocol: any) => {
  protocolIdMap[protocol.id] = protocol.name;
  categoryMap[protocol.id] = protocol.category;
});

// Platforms where onChainMcap should be set equal to activeMcap
export const ONCHAIN_MCAP_EQUALS_ACTIVE_PLATFORMS = new Set(["xStock", "Backed Finance"]);