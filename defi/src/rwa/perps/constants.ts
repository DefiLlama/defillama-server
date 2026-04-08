import {
    createAirtableHeaderToCanonicalKeyMapper,
    toStringArrayOrNull,
    toStringOrNull,
} from "../utils";
import { HYPERLIQUID_MAKER_FEE, HYPERLIQUID_TAKER_FEE, HYPERLIQUID_DEPLOYER_SHARE } from "./platforms/hyperliquid";

export interface PerpsContractMetadata {
    referenceAsset: string | null;
    referenceAssetGroup: string | null;
    assetClass: string[] | null;
    parentPlatform: string | null;
    pair: string | null;
    marginAsset: string | null;
    settlementAsset: string | null;
    category: string[] | null;
    issuer: string | null;
    website: string[] | null;
    oracleProvider: string | null;
    description: string | null;
    accessModel: string | null;
    rwaClassification: string | null;
    makerFeeRate: number;
    takerFeeRate: number;
    deployerFeeShare: number;
}

export const PERPS_ALWAYS_STRING_ARRAY_FIELDS = new Set<string>([
    "assetClass",
    "category",
    "website",
]);

export const PERPS_STRING_OR_NULL_FIELDS = new Set<string>([
    "referenceAsset",
    "referenceAssetGroup",
    "parentPlatform",
    "pair",
    "marginAsset",
    "settlementAsset",
    "issuer",
    "oracleProvider",
    "description",
    "accessModel",
    "rwaClassification",
]);

const CONTRACT_METADATA: { [contractId: string]: PerpsContractMetadata } = {};

const PERPS_METADATA_KEY_MAP = {
    contract: "Canonical Market ID",
    referenceAsset: "Reference Asset",
    referenceAssetGroup: "Asset Group",
    assetClass: "Asset Class",
    parentPlatform: "Parent Platform",
    pair: "Pair",
    marginAsset: "Margin Asset",
    settlementAsset: "Settlement Asset",
    category: "Category",
    issuer: "Issuer",
    website: "Website",
    oracleProvider: "Oracle Provider",
    description: "Description",
    accessModel: "Access Model",
    rwaClassification: "RWA Classification",
    makerFeeRate: "Maker Fee Rate",
    takerFeeRate: "Taker Fee Rate",
    deployerFeeShare: "Deployer Fee Share",
} as const;

export function normalizePerpsMetadataInPlace(target: any): any {
    if (!target || typeof target !== "object") return target;

    if (target.contract == null && target.coin != null) {
        target.contract = target.coin;
    }
    if ("coin" in target) {
        delete target.coin;
    }

    if ("contract" in target) {
        target.contract = toStringOrNull(target.contract);
    }

    for (const field of PERPS_ALWAYS_STRING_ARRAY_FIELDS) {
        if (field in target) target[field] = toStringArrayOrNull(target[field]);
    }

    for (const field of PERPS_STRING_OR_NULL_FIELDS) {
        if (field in target) target[field] = toStringOrNull(target[field]);
    }

    return target;
}

export function getContractMetadata(contract: string): PerpsContractMetadata | null {
    return CONTRACT_METADATA[contract.toLowerCase()] ?? null;
}

export function setContractMetadata(contract: string, metadata: PerpsContractMetadata): void {
    CONTRACT_METADATA[contract.toLowerCase()] = metadata;
}

export function hasContractMetadata(contract: string): boolean {
    return contract.toLowerCase() in CONTRACT_METADATA;
}

export function resetContractMetadataStore(): void {
    for (const key of Object.keys(CONTRACT_METADATA)) {
        delete CONTRACT_METADATA[key];
    }
}

export function getContractId(contract: string): string {
    return contract.toLowerCase();
}

export const CIRCUIT_BREAKER_THRESHOLD = 0.5;

/**
 * Load perps market metadata from the shared RWA Airtable sheet.
 * Only rows with a non-empty `Canonical Market ID` column are relevant.
 * The canonical market identifier is exposed as `contract` in this module.
 */
export async function loadContractMetadataFromAirtable(): Promise<number> {
    const { getCsvData } = await import("../spreadsheet");
    const rows = await getCsvData();
    const headerToKey = createAirtableHeaderToCanonicalKeyMapper(PERPS_METADATA_KEY_MAP);

    let count = 0;
    for (const row of rows as any[]) {
        const mapped: Record<string, unknown> = {};
        for (const [header, value] of Object.entries(row || {})) {
            const key = headerToKey(String(header));
            if (!key || !(key in PERPS_METADATA_KEY_MAP)) continue;
            mapped[key] = value;
        }

        const contract = toStringOrNull(mapped.contract);
        const trimmed = contract?.trim();
        if (!trimmed) continue;

        const toNum = (v: any, fallback: number): number => {
            if (typeof v === "string" && v.trim() === "") return fallback;
            const n = Number(v);
            return Number.isFinite(n) ? n : fallback;
        };

        const metadata: PerpsContractMetadata = {
            referenceAsset: toStringOrNull(mapped.referenceAsset),
            referenceAssetGroup: toStringOrNull(mapped.referenceAssetGroup),
            assetClass: toStringArrayOrNull(mapped.assetClass),
            parentPlatform: toStringOrNull(mapped.parentPlatform),
            pair: toStringOrNull(mapped.pair),
            marginAsset: toStringOrNull(mapped.marginAsset),
            settlementAsset: toStringOrNull(mapped.settlementAsset),
            category: toStringArrayOrNull(mapped.category),
            issuer: toStringOrNull(mapped.issuer),
            website: toStringArrayOrNull(mapped.website),
            oracleProvider: toStringOrNull(mapped.oracleProvider),
            description: toStringOrNull(mapped.description),
            accessModel: toStringOrNull(mapped.accessModel),
            rwaClassification: toStringOrNull(mapped.rwaClassification),
            makerFeeRate: toNum(mapped.makerFeeRate, HYPERLIQUID_MAKER_FEE),
            takerFeeRate: toNum(mapped.takerFeeRate, HYPERLIQUID_TAKER_FEE),
            deployerFeeShare: toNum(mapped.deployerFeeShare, HYPERLIQUID_DEPLOYER_SHARE),
        };

        normalizePerpsMetadataInPlace(metadata);
        setContractMetadata(trimmed, metadata);
        count++;
    }

    return count;
}
