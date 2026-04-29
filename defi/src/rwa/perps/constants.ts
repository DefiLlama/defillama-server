require("dotenv").config();

import {
    createAirtableHeaderToCanonicalKeyMapper,
    toStringArrayOrNull,
    toStringOrNull,
} from "../utils";
import { HYPERLIQUID_MAKER_FEE, HYPERLIQUID_TAKER_FEE, HYPERLIQUID_DEPLOYER_SHARE } from "./platforms/adapters/hyperliquid";

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
// Alias map: base contract name (without margin-asset suffix) → full canonical key
// e.g. "cash:hood" → "cash:hood-usdt"
const CONTRACT_ALIAS: { [base: string]: string } = {};

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

export function resolveContractKey(contract: string): string | undefined {
    const key = contract.toLowerCase();
    if (key in CONTRACT_METADATA) return key;
    if (key in CONTRACT_ALIAS) return CONTRACT_ALIAS[key];

    const colonIdx = key.indexOf(":");
    const afterColon = colonIdx >= 0 ? colonIdx + 1 : 0;
    const hyphenIdx = key.indexOf("-", afterColon);
    if (hyphenIdx > afterColon) {
        const stripped = key.substring(0, hyphenIdx);
        if (stripped in CONTRACT_METADATA) return stripped;
        if (stripped in CONTRACT_ALIAS) return CONTRACT_ALIAS[stripped];
    }

    return undefined;
}

export function getContractMetadata(contract: string): PerpsContractMetadata | null {
    const key = resolveContractKey(contract);
    return key ? CONTRACT_METADATA[key] : null;
}

export function setContractMetadata(contract: string, metadata: PerpsContractMetadata): void {
    CONTRACT_METADATA[contract.toLowerCase()] = metadata;
}

export function hasContractMetadata(contract: string): boolean {
    return resolveContractKey(contract) !== undefined;
}

export function resetContractMetadataStore(): void {
    for (const key of Object.keys(CONTRACT_METADATA)) delete CONTRACT_METADATA[key];
    for (const key of Object.keys(CONTRACT_ALIAS)) delete CONTRACT_ALIAS[key];
}

export function getContractId(contract: string): string {
    return contract.toLowerCase();
}

export const CIRCUIT_BREAKER_THRESHOLD = 0.5;

// ---------------------------------------------------------------------------
// Crypto / forex filters — used to suppress non-RWA markets in skip alerts
// ---------------------------------------------------------------------------

const FOREX_CODES = new Set([
    "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD", "NOK", "SEK", "DKK",
    "SGD", "HKD", "CNY", "CNH", "MXN", "ZAR", "TRY", "PLN", "CZK", "HUF",
    "INR", "BRL", "KRW", "TWD", "THB",
]);

const CRYPTO_TICKERS = new Set([
    "BTC", "ETH", "SOL", "DOGE", "XRP", "ADA", "AVAX", "DOT", "MATIC", "LINK",
    "UNI", "AAVE", "COMP", "MKR", "SNX", "CRV", "SUSHI", "YFI", "LDO", "ARB",
    "OP", "APT", "SUI", "SEI", "TIA", "NEAR", "ATOM", "FTM", "INJ", "STX",
    "PEPE", "SHIB", "WIF", "BONK", "FLOKI", "MEME", "WLD", "JUP", "JTO",
    "PYTH", "RNDR", "FIL", "GRT", "IMX", "MANA", "SAND", "AXS", "APE",
    "LTC", "BCH", "ETC", "XLM", "ALGO", "HBAR", "VET", "EGLD", "FLR",
    "BNB", "TON", "TRX", "LEO", "OKB", "CRO", "RUNE", "GALA", "ENS",
    "EOS", "XTZ", "THETA", "NEO", "WAVES", "ZEC", "DASH", "IOTA", "XMR",
    "LUNC", "KAVA", "CFX", "BLUR", "STRK", "ZK", "W", "ETHFI", "ENA",
    "PENDLE", "EIGEN", "MOVE", "HYPE", "VIRTUAL", "AI16Z", "FARTCOIN",
    "TRUMP", "MELANIA", "TAO", "RENDER", "FET", "AGIX", "OCEAN", "TURBO",
    "WEN", "MEW", "POPCAT", "NEIRO", "PURR", "DEEP", "BERA", "IP",
    "KAITO", "TST", "VINE", "ANIME", "LAYER3", "NIL", "PARTI",
    "ONDO", "MANTRA", "OM",
]);

/**
 * Extract the base ticker from a contract string.
 * e.g. "gtrade:EUR-USD" → "EUR", "BTC" → "BTC", "helix:AAPL-USDT" → "AAPL"
 */
function extractBaseTicker(contract: string): string {
    // Strip platform prefix (before ":")
    const afterColon = contract.includes(":") ? contract.split(":")[1] : contract;
    // Strip quote suffix (after "-")
    const beforeDash = afterColon.includes("-") ? afterColon.split("-")[0] : afterColon;
    // Strip numeric suffixes like _1, _2 (gTrade uses GOOGL_1)
    return beforeDash.replace(/_\d+$/, "").toUpperCase();
}

/** Returns true if the contract looks like a forex pair or crypto ticker (not RWA). */
export function isLikelyCryptoOrForex(contract: string): boolean {
    const base = extractBaseTicker(contract);
    return FOREX_CODES.has(base) || CRYPTO_TICKERS.has(base);
}

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
        // Delisted markets must be excluded from the perps pipeline entirely —
        // by not registering metadata, `hasContractMetadata` returns false and the
        // market is skipped in both ingest (perps.ts) and output (cron.ts).
        if (row?.Delisted === true) continue;

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

        // Register suffix-stripped alias so Hyperliquid names like "cash:HOOD"
        // match Airtable entries like "cash:HOOD-USDT" or "flx:OIL-USDH"
        const colonIdx = trimmed.indexOf(":");
        const afterColon = colonIdx >= 0 ? colonIdx + 1 : 0;
        const hyphenIdx = trimmed.indexOf("-", afterColon);
        if (hyphenIdx > afterColon) {
            const base = trimmed.substring(0, hyphenIdx).toLowerCase();
            if (!(base in CONTRACT_METADATA) && !(base in CONTRACT_ALIAS)) {
                CONTRACT_ALIAS[base] = trimmed.toLowerCase();
            }
        }

        count++;
    }

    return count;
}
