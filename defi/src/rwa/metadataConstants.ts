// Lightweight constants for RWA metadata normalization.
// Keep this file free of heavy imports (e.g. protocol lists) so it can be used by `utils.ts`.

export const keyMap: { [value: string]: string } = {
  coingeckoId: "*Coingecko ID",
  onChain: "onChainMcap",
  defiActive: "defiActiveTvl",
  excluded: "*",
  assetName: "Name",
  id: "*RWA ID",
  projectId: "*projectID",
  excludedWallets: "*Holders to be Removed for Active Marketcap",
  activeMcap: "activeMcap",
  price: "price",
  holdersToRemove: "*HoldersToBeRemovedForActiveMarketcap",
};

// Some metadata fields should always be exposed as string arrays in the API,
// even if the underlying stored metadata is a single string (legacy) or mixed types.
export const ALWAYS_STRING_ARRAY_FIELDS = new Set<string>([
  "website",
  "twitter",
  "chain",
  "assetClass",
  "category",
  "issuerSourceLink",
  "issuerRegistryInfo",
  "attestationLinks",
  "descriptionNotes",
]);

export const RWA_STRING_OR_NULL_FIELDS = new Set<string>([
  "ticker",
  "name",
  "primaryChain",
  "type",
  "rwaClassification",
  "issuer",
  "isin",
]);

export const RWA_BOOLEAN_OR_NULL_FIELDS = new Set<string>([
  "attestations",
  "redeemable",
  "cexListed",
  "kycForMintRedeem",
  "kycAllowlistedWhitelistedToTransferHold",
  "transferable",
  "selfCustody",
  "stablecoin",
  "governance",
]);

export const stablecoinCategories = new Set([
  "Fiat-Backed Stablecoins",
  "Stablecoins backed by RWAs",
  "Non-RWA Stablecoins",
]);
export const stablecoinAssetClasses = new Set([
  "USD fiat stablecoin",
  "Synthetic backed stablecoin",
  "Crypto-collateralized stablecoin (non-RWA)",
  "Hybrid / multi-asset RWA stablecoin",
  "Yield-bearing RWA stablecoin",
  "Stablecoin yield wrapper",
  "Other fiat stablecoin",
  "EUR fiat stablecoin",
  "Algorithmic / undercollateralized stablecoin",
  "RWA-backed fiat stablecoin (non-yielding)",
  "Yield-bearing fiat stablecoin",
  "Bank deposit token",
]);
export const stablecoinClassifications = new Set<string>([]);

export const governanceCategories = new Set(["Governance & Protocol Tokens"]);
export const governanceAssetClasses = new Set([
  "Governance / voting token (RWA protocol)",
  "Revenue / fee share token (RWA protocol)",
]);
export const governanceClassifications = new Set(["Non-RWA (Gov/Utility)"]);

