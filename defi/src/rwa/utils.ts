import { chainsThatShouldNotBeLowerCased } from "../utils/shared/constants";
import { getChainDisplayName } from "../utils/normalizeChain";
import {
  RWA_ALWAYS_STRING_ARRAY_FIELDS,
  RWA_BOOLEAN_OR_NULL_FIELDS,
  RWA_STRING_OR_NULL_FIELDS,
  RWA_STABLECOIN_ASSET_CLASSES,
  RWA_STABLECOIN_CATEGORIES,
  RWA_STABLECOIN_CLASSIFICATIONS,
  RWA_GOVERNANCE_ASSET_CLASSES,
  RWA_GOVERNANCE_CATEGORIES,
  RWA_GOVERNANCE_CLASSIFICATIONS,
} from "./metadataConstants";

// convert spreadsheet titles to API format
export function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\//g, " ")
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, "");
}

// Sort tokens by chain and map token to project for fetching supplies, tvls etc
export function sortTokensByChain(tokens: { [protocol: string]: string[] }): {
  tokensSortedByChain: { [chain: string]: string[] };
  tokenToProjectMap: { [token: string]: string };
} {
  const tokensSortedByChain: { [chain: string]: string[] } = {};
  const tokenToProjectMap: { [token: string]: string } = {};

  Object.keys(tokens).map((protocol: string) => {
    tokens[protocol].map((pk: any) => {
      if (pk == false || pk == null) return;
      const chain: string = pk.substring(0, pk.indexOf(":"));

      if (!tokensSortedByChain[chain]) tokensSortedByChain[chain] = [];
      const normalizedPk: string = chainsThatShouldNotBeLowerCased.includes(chain) ? pk : pk.toLowerCase();

      tokensSortedByChain[chain].push(normalizedPk);
      tokenToProjectMap[normalizedPk] = protocol;
    });
  });

  return { tokensSortedByChain, tokenToProjectMap };
}

export const fetchBurnAddresses = (chain: string): string[] =>
  chain == "solana"
    ? ["1nc1nerator11111111111111111111111111111111"]
    : ["0x0000000000000000000000000000000000000000", "0x000000000000000000000000000000000000dead"];

/**
 * Create a fast Airtable header -> canonical key mapper.
 *
 * - Known headers are mapped using the provided `keyMap` (canonicalKey -> AirtableHeader).
 * - Unknown headers fall back to cached `toCamelCase(header)`.
 * - Unmapped Airtable internal fields starting with `*` are skipped (return null).
 */
export function createAirtableHeaderToCanonicalKeyMapper(keyMap: Record<string, string>) {
  const headerToCanonicalKey: Record<string, string> = {};
  for (const [canonicalKey, header] of Object.entries(keyMap || {})) {
    if (typeof header === "string" && header) headerToCanonicalKey[header] = canonicalKey;
  }

  const camelCache = new Map<string, string>();

  return (header: string): string | null => {
    if (!header) return null;
    const mapped = headerToCanonicalKey[header];
    if (mapped) return mapped;

    // Skip Airtable internal columns by default
    if (header.startsWith("*")) return null;

    const cached = camelCache.get(header);
    if (cached) return cached;
    const computed = toCamelCase(header);
    camelCache.set(header, computed);
    return computed;
  };
}

// Convert chain keys to chain labels in an object
export function toFiniteNumberOrZero(value: any): number {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function toFiniteNumberOrNull(value: any): number | null {
  if (value == null) return null;
  if (value === "" || (typeof value === "string" && value.trim() === "")) return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

// JS `.toFixed()` returns a string; this helper forces a numeric output.
// Useful for API fields where consumers expect numbers (not fixed strings).
export function toFixedNumber(value: any, decimals: number = 0): number {
  const d = Number.isFinite(decimals) ? decimals : 0;
  if (value == null) return 0;

  try {
    // Native number
    if (typeof value === "number") return Number(value.toFixed(d));

    // bignumber.js / other numeric-like objects
    if (typeof (value as any)?.toFixed === "function") {
      const fixed = (value as any).toFixed(d);
      const parsed = Number(fixed);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    // Fallback: coerce then round
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Number(num.toFixed(d));
  } catch {
    return 0;
  }
}

const formatNum = (value: any, maxDecimals?: number): string => {
  if (!value && value !== 0) return "0";

  // Convert to number for validation
  const numValue = Number(value);
  if (Number.isNaN(numValue) || !Number.isFinite(numValue)) {
    return Number.isNaN(numValue) ? "0" : String(numValue);
  }

  // Handle scientific notation
  let processedValue = typeof value === "number" ? value.toString() : String(value);
  const isScientificNotation = /[eE]/.test(processedValue);

  if (isScientificNotation) {
    // Convert to fixed decimal string with enough precision
    processedValue = numValue.toFixed(20).replace(/\.?0+$/, "");
  }

  const [num, decimals] = processedValue.split(".");

  if (!decimals) return num;

  if (decimals?.startsWith("999")) {
    return Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });
  }

  if (decimals?.startsWith("0000000000")) {
    return Number(value).toFixed(0);
  }

  if (maxDecimals !== undefined) {
    const decimalsToShow = decimals.substring(0, maxDecimals);
    // Check if all digits are zeros
    let allZeros = true;
    for (let i = 0; i < decimalsToShow.length; i++) {
      if (decimalsToShow[i] !== "0") {
        allZeros = false;
        break;
      }
    }
    // If all decimal digits are zeros, return without decimal point
    if (allZeros) {
      return num;
    }
    return num + "." + decimalsToShow;
  }

  // No maxDecimals provided - default behavior
  const absValue = Math.abs(numValue);
  const isLessThanPointOne = absValue > 0 && absValue < 0.1;

  // Count leading zeros (needed for determining decimal places)
  let leadingZeros = 0;
  for (let i = 0; i < decimals.length; i++) {
    if (decimals[i] === "0") {
      leadingZeros++;
    } else {
      break;
    }
  }

  if (isLessThanPointOne) {
    // If 3 or more zeros, return "0"
    if (leadingZeros >= 3) {
      return "0";
    }

    // Only show all digits if there are exactly 2 leading zeros AND the decimal is short (like 0.002, 0.001)
    // For longer decimals or 1 leading zero, show max 2 decimals (like 0.008, 0.07)
    if (leadingZeros === 2 && decimals.length <= 4) {
      // For very small numbers < 0.1 with exactly 2 leading zeros and short decimals, show all digits
      return num + "." + decimals;
    }
    // Fall through to max 2 decimals logic below
  }

  // For numbers >= 0.1 but < 1, or >= 1, show max 2 decimals
  // For numbers < 0.1, show 3 decimals only if there are 2 leading zeros (to get 0.008), otherwise 2 decimals
  const maxDecimalsToShow = absValue < 0.1 && leadingZeros === 2 ? 3 : 2;
  const decimalsToShow = decimals.substring(0, maxDecimalsToShow);

  // Remove trailing zeros
  let endIndex = decimalsToShow.length;
  while (endIndex > 0 && decimalsToShow[endIndex - 1] === "0") {
    endIndex--;
  }

  if (endIndex === 0) {
    return num;
  }

  return num + "." + decimalsToShow.substring(0, endIndex);
};

// Numeric variant of formatNum. Useful when you want a number (not a display string).
// Note: this intentionally normalizes locale formatting (e.g. "1,234.56") back into a number.
export const formatNumAsNumber = (value: any, maxDecimals?: number): number => {
  if (!value && value !== 0) return 0;

  const numValue = Number(value);
  if (Number.isNaN(numValue)) return 0;
  if (!Number.isFinite(numValue)) return numValue; // Infinity / -Infinity

  const formatted = formatNum(value, maxDecimals);
  const normalized = formatted.replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function toStringArrayOrNull(value: any): string[] | null {
  if (value == null) return null;

  const items = (Array.isArray(value) ? value : [value])
    .flatMap((v) => {
      if (v == null) return [];
      if (typeof v === "string") return [v];
      return [String(v)];
    })
    .map((s) => s.trim())
    .filter(Boolean);

  if (!items.length) return null;
  // Dedup while preserving order
  return Array.from(new Set(items));
}

function normalizeStringArrayFieldsInPlace(
  target: any,
  fields: ReadonlySet<string> = RWA_ALWAYS_STRING_ARRAY_FIELDS
): any {
  if (!target || typeof target !== "object") return target;
  for (const field of fields) {
    if (field in target) target[field] = toStringArrayOrNull(target[field]);
  }
  return target;
}

export function normalizeDashToNull(value: any) {
  if (typeof value === "string" && value.trim() === "-") return null;
  return value;
}

function toStringOrNull(value: any): string | null {
  value = normalizeDashToNull(value);
  if (value == null) return null;
  if (typeof value === "string") {
    const s = value.trim();
    return s ? s : null;
  }
  // Preserve existing semantics (avoid "[object Object]" as much as possible)
  if (typeof value === "number" && !Number.isFinite(value)) return String(value);
  return String(value);
}

function toBooleanOrNull(value: any): boolean | null {
  value = normalizeDashToNull(value);
  if (value == null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (!s) return null;
    if (["true", "t", "yes", "y", "1"].includes(s)) return true;
    if (["false", "f", "no", "n", "0"].includes(s)) return false;
    return null;
  }
  return null;
}

type RwaAccessModel =
  | "Permissioned"
  | "Permissionless"
  | "Non-transferable"
  | "Custodial Only"
  | "Unknown";

function getAccessModel(asset: {
  kycAllowlistedWhitelistedToTransferHold?: boolean | null;
  transferable?: boolean | null;
  selfCustody?: boolean | null;
}): RwaAccessModel {
  // IMPORTANT: Ignore Airtable's `accessModel` and always derive it from flags.
  //
  // Methodology:
  // - If Whitelisted hold/transfer = ✓ → Permissioned
  // - Else if Transferable ✓ and Self Custody ✓ → Permissionless
  // - Else if Transferable x and Self Custody ✓ → Non-transferable
  // - Else if Self Custody x → Custodial Only
  //
  // Notes:
  // - This intentionally matches the "truthy/falsy + null-check" behavior provided by the user.
  if (asset.kycAllowlistedWhitelistedToTransferHold) {
    return "Permissioned";
  }

  if (asset.transferable && asset.selfCustody) {
    return "Permissionless";
  }

  if (asset.transferable === false && asset.selfCustody) {
    return "Non-transferable";
  }

  if (asset.selfCustody === false) {
    return "Custodial Only";
  }

  return "Unknown";
}

function parseChainAddressListToLabelMap(value: any): { [chainLabel: string]: string[] } | null {
  const items = toStringArrayOrNull(value);
  if (!items || !items.length) return null;

  const out: { [chainLabel: string]: string[] } = {};
  for (const raw of items) {
    if (!raw) continue;
    const idx = raw.indexOf(":");
    if (idx === -1) continue;
    const chainRaw = raw.slice(0, idx);
    const address = raw.slice(idx + 1);
    if (!chainRaw || !address) continue;
    const chainLabel = getChainDisplayName(chainRaw.toLowerCase(), true);
    if (!out[chainLabel]) out[chainLabel] = [];
    out[chainLabel].push(address);
  }

  // Dedup while preserving order
  for (const chain of Object.keys(out)) {
    out[chain] = Array.from(new Set(out[chain]));
  }

  return Object.keys(out).length ? out : null;
}

function deriveStablecoinAndGovernanceFlags(target: any): { stablecoin: boolean; governance: boolean } {
  const normalizeStringList = (value: any): string[] => {
    if (!Array.isArray(value)) return [];
    return value
      .filter((v) => typeof v === "string")
      .map((v: string) => v.trim())
      .filter(Boolean);
  };

  const categories = normalizeStringList(target?.category);
  const assetClasses = normalizeStringList(target?.assetClass);

  const classifications = Array.isArray(target?.rwaClassification)
    ? normalizeStringList(target?.rwaClassification)
    : typeof target?.rwaClassification === "string"
      ? [target.rwaClassification.trim()].filter(Boolean)
      : [];

  const hasAny = (arr: string[], pred: (s: string) => boolean) => arr.some(pred);

  const stablecoin =
    hasAny(categories, (c) => c.toLowerCase().includes("stablecoin") || RWA_STABLECOIN_CATEGORIES.has(c)) ||
    hasAny(assetClasses, (c) => RWA_STABLECOIN_ASSET_CLASSES.has(c)) ||
    hasAny(classifications, (c) => RWA_STABLECOIN_CLASSIFICATIONS.has(c));

  const governance =
    hasAny(categories, (c) => c.toLowerCase().includes("governance") || RWA_GOVERNANCE_CATEGORIES.has(c)) ||
    hasAny(assetClasses, (c) => RWA_GOVERNANCE_ASSET_CLASSES.has(c)) ||
    hasAny(classifications, (c) => RWA_GOVERNANCE_CLASSIFICATIONS.has(c));

  return { stablecoin, governance };
}

/**
 * Normalize RWA metadata object into stable API-friendly types.
 * - specified list fields -> string[]|null
 * - specified scalar fields -> string|null
 * - specified flags -> boolean|null
 * - accessModel -> derived enum from flags (defaults to "Unknown")
 * - price -> number|null
 */
export function normalizeRwaMetadataForApiInPlace(target: any): any {
  if (!target || typeof target !== "object") return target;

  // Normalize list fields
  normalizeStringArrayFieldsInPlace(target, RWA_ALWAYS_STRING_ARRAY_FIELDS);

  // Normalize scalar string fields
  for (const field of RWA_STRING_OR_NULL_FIELDS) {
    if (field in target) target[field] = toStringOrNull(target[field]);
  }

  // Normalize boolean flags
  for (const field of RWA_BOOLEAN_OR_NULL_FIELDS) {
    if (field in target) target[field] = toBooleanOrNull(target[field]);
  }

  // Derive access model enum (ignore Airtable `accessModel`)
  // Must always be a valid enum value (default to "Unknown" when missing/unknown)
  target.accessModel = getAccessModel(target as any);

  // Normalize chain display names
  if (Array.isArray(target.chain)) {
    target.chain = target.chain.length
      ? target.chain.map((c: any) => (typeof c === "string" ? getChainDisplayName(c.toLowerCase(), true) : c)).filter(Boolean)
      : null;
  }
  if (typeof target.primaryChain === "string" && target.primaryChain) {
    target.primaryChain = getChainDisplayName(target.primaryChain.toLowerCase(), true);
  }

  // Normalize Contracts -> { [chainLabel]: string[] }
  if ("contracts" in target) {
    const parsed = parseChainAddressListToLabelMap(target.contracts);
    target.contracts = parsed;
  }

  // Normalize holdersToRemove (support legacy excludedWallets alias too)
  if (target.holdersToRemove == null && target.excludedWallets != null) {
    target.holdersToRemove = target.excludedWallets;
  }
  if ("holdersToRemove" in target) {
    target.holdersToRemove = parseChainAddressListToLabelMap(target.holdersToRemove);
  }
  if ("excludedWallets" in target) {
    // Prevent storing both legacy and canonical variants
    delete target.excludedWallets;
  }

  // Derive category flags
  const flags = deriveStablecoinAndGovernanceFlags(target);
  target.stablecoin = flags.stablecoin;
  target.governance = flags.governance;

  // Normalize price
  if (!("price" in target)) target.price = null;
  target.price = toFiniteNumberOrNull(target.price);
  if (target.price != null) target.price = formatNumAsNumber(target.price);

  return target;
}


const LEADING_DASH_REGEX = /^-+/
const TRAILING_DASH_REGEX = /-+$/
const NON_WORD_REGEX = /[^\w]+/g
const MULTI_DASH_REGEX = /-+/g

const safeDecode = (input: string) => {
	try {
		return decodeURIComponent(input)
	} catch {
		return input
	}
}


// RWA-specific slug: must be safe as a *single* URL segment (no `/`).
export const rwaSlug = (input = ''): string => {
	const normalized = safeDecode(String(input)).toLowerCase().trim()
	return normalized
		.replace(NON_WORD_REGEX, '-')
		.replace(MULTI_DASH_REGEX, '-')
		.replace(LEADING_DASH_REGEX, '')
		.replace(TRAILING_DASH_REGEX, '')
}