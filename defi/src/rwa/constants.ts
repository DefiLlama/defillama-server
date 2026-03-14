import protocols from "../protocols/data";
import entities from "../protocols/entities";
import treasuries from "../protocols/treasury";

export const excludedProtocolCategories: string[] = ["CEX"];

export const unsupportedChains: string[] = [];

// Chains that only support current (live) data — historical refills cannot regenerate their values
export const noHistoricalChains: string[] = ['solana', 'provenance', 'stellar'];


export const protocolIdMap: { [id: string]: string } = {};
export const categoryMap: { [category: string]: string } = {};
[...protocols, ...entities, ...treasuries].map((protocol: any) => {
  protocolIdMap[protocol.id] = protocol.name;
  categoryMap[protocol.id] = protocol.category;
});