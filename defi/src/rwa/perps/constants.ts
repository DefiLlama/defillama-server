export interface MarketMetadata {
    referenceAsset: string;
    referenceAssetGroup: string;
    assetClass: string;
    parentPlatform: string;
    pair: string;
    marginAsset: string;
    settlementAsset: string;
    category: string[];
    issuer: string | null;
    website: string | null;
    oracleProvider: string | null;
    description: string | null;
    accessModel: string;
    rwaClassification: string | null;
    makerFeeRate: number;
    takerFeeRate: number;
    deployerFeeShare: number;
}

// Rates for Hyperliquid HIP-3 venues https://hyperliquid.gitbook.io/hyperliquid-docs/trading/fees
export const HYPERLIQUID_MAKER_FEE = 0.0002;
export const HYPERLIQUID_TAKER_FEE = 0.0005;
export const HYPERLIQUID_DEPLOYER_SHARE = 0.5;

export const PERPS_CATEGORIES = [
    "Political",
    "Meme",
    "Crypto",
    "Commodity",
    "Equity",
    "FX",
    "Index",
    "Other",
] as const;

export const PERPS_ASSET_CLASSES = [
    "Perpetual Future",
    "Prediction Market",
] as const;

export const PERPS_PLATFORMS = [
    "Hyperliquid",
] as const;

// market ID = {venue}:{coin}
const MARKET_METADATA: { [marketId: string]: MarketMetadata } = {};

export function getMarketMetadata(coin: string, venue: string): MarketMetadata | null {
    const key = `${venue}:${coin}`.toLowerCase();
    return MARKET_METADATA[key] ?? null;
}

export function setMarketMetadata(coin: string, venue: string, metadata: MarketMetadata): void {
    const key = `${venue}:${coin}`.toLowerCase();
    MARKET_METADATA[key] = metadata;
}

export function hasMarketMetadata(coin: string, venue: string): boolean {
    const key = `${venue}:${coin}`.toLowerCase();
    return key in MARKET_METADATA;
}

export function getMarketId(coin: string, venue: string): string {
    return `${venue}:${coin}`.toLowerCase();
}

export const CIRCUIT_BREAKER_THRESHOLD = 0.5;
