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

import { HYPERLIQUID_MAKER_FEE, HYPERLIQUID_TAKER_FEE, HYPERLIQUID_DEPLOYER_SHARE } from "./platforms/hyperliquid";

const MARKET_METADATA: { [marketId: string]: MarketMetadata } = {};

export function getMarketMetadata(coin: string): MarketMetadata | null {
    return MARKET_METADATA[coin.toLowerCase()] ?? null;
}

export function setMarketMetadata(coin: string, metadata: MarketMetadata): void {
    MARKET_METADATA[coin.toLowerCase()] = metadata;
}

export function hasMarketMetadata(coin: string): boolean {
    return coin.toLowerCase() in MARKET_METADATA;
}

export function getMarketId(coin: string): string {
    return coin.toLowerCase();
}

export const CIRCUIT_BREAKER_THRESHOLD = 0.5;

// Column name in Airtable that identifies perps rows
const CANONICAL_MARKET_ID_COLUMN = "Canonical Market ID";

/**
 * Load perps market metadata from the shared RWA Airtable sheet.
 * Only rows with a non-empty `Canonical Market ID` column are relevant.
 * The market ID is the coin name (already unique across venues).
 */
export async function loadMarketMetadataFromAirtable(): Promise<number> {
    const { getCsvData } = await import("../spreadsheet");
    const rows = await getCsvData();

    let count = 0;
    for (const row of rows as any[]) {
        const coin = row[CANONICAL_MARKET_ID_COLUMN];
        if (!coin || typeof coin !== "string") continue;

        const trimmed = coin.trim();
        if (!trimmed) continue;

        const toStr = (v: any): string => (v != null && v !== "" ? String(v).trim() : "");
        const toStrOrNull = (v: any): string | null => {
            const s = toStr(v);
            return s || null;
        };
        const toNum = (v: any, fallback: number): number => {
            const n = Number(v);
            return Number.isFinite(n) ? n : fallback;
        };
        const toStrArray = (v: any): string[] => {
            if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
            const s = toStr(v);
            return s ? [s] : [];
        };

        const metadata: MarketMetadata = {
            referenceAsset: toStr(row["Reference Asset"]),
            referenceAssetGroup: toStr(row["Reference Asset Group"]),
            assetClass: toStr(row["Asset Class"]),
            parentPlatform: toStr(row["Parent Platform"]),
            pair: toStr(row["Pair"]),
            marginAsset: toStr(row["Margin Asset"]),
            settlementAsset: toStr(row["Settlement Asset"]),
            category: toStrArray(row["Category"]),
            issuer: toStrOrNull(row["Issuer"]),
            website: toStrOrNull(row["Website"]),
            oracleProvider: toStrOrNull(row["Oracle Provider"]),
            description: toStrOrNull(row["Description"]),
            accessModel: toStr(row["Access Model"]),
            rwaClassification: toStrOrNull(row["RWA Classification"]),
            makerFeeRate: toNum(row["Maker Fee Rate"], HYPERLIQUID_MAKER_FEE),
            takerFeeRate: toNum(row["Taker Fee Rate"], HYPERLIQUID_TAKER_FEE),
            deployerFeeShare: toNum(row["Deployer Fee Share"], HYPERLIQUID_DEPLOYER_SHARE),
        };

        setMarketMetadata(trimmed, metadata);
        count++;
    }

    return count;
}
