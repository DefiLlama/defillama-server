import protocols from "../protocols/data";
import entities from "../protocols/entities";
import treasuries from "../protocols/treasury";

export const excludedProtocolCategories: string[] = ["CEX"];

export const keyMap: { [value: string]: string } = {
    coingeckoId: "*Coingecko ID",
    onChain: "onChainMarketcap",
    defiActive: "defiActiveTvl",
    excluded: "*",
    assetName: "Name",
    id: "*RWA ID",
    projectId: "*projectID",
    excludedWallets: "*Holders to be Removed for Active Marketcap",
    activeMcap: "activeMcap",
    price: "price",
    holdersToRemove: "*HoldersToBeRemovedForActiveMarketcap"
};

export const unsupportedChains = ["provenance", "stellar"];


export const protocolIdMap: { [id: string]: string } = {};
export const categoryMap: { [category: string]: string } = {};
[...protocols, ...entities, ...treasuries].map((protocol: any) => {
  protocolIdMap[protocol.id] = protocol.name;
  categoryMap[protocol.id] = protocol.category;
});

