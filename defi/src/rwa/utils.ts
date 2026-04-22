import { bridgedTvlMixedCaseChains } from "../utils/shared/constants";
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
      const normalizedPk: string = bridgedTvlMixedCaseChains.includes(chain) ? pk : pk.toLowerCase();

      tokensSortedByChain[chain].push(normalizedPk);
      tokenToProjectMap[normalizedPk] = protocol;
    });
  });

  return { tokensSortedByChain, tokenToProjectMap };
}

export const fetchBurnAddresses = (chain: string): string[] => {
  if (chain == "solana") return ["1nc1nerator11111111111111111111111111111111"];
  // Provenance and Stellar have no conventional burn address
  if (chain == "provenance" || chain == "stellar") return [];
  return ["0x0000000000000000000000000000000000000000", "0x000000000000000000000000000000000000dead"];
};

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

  // Collapse internal whitespace (newlines, tabs, multi-spaces) to a single space
  // before trimming. Without this, values like "Stablecoins\n  backed by RWAs"
  // survive as distinct keys in aggregation maps but slugify identically, causing
  // one to silently overwrite the other when saved to disk.
  const items = (Array.isArray(value) ? value : [value])
    .flatMap((v) => {
      if (v == null) return [];
      if (typeof v === "string") return [v];
      return [String(v)];
    })
    .map((s) => s.replace(/\s+/g, " ").trim())
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

export function toStringOrNull(value: any): string | null {
  value = normalizeDashToNull(value);
  if (value == null) return null;
  if (typeof value === "boolean") return null;
  if (typeof value === "string") {
    // Collapse internal whitespace (newlines, tabs, multi-spaces) to single space,
    // matching the same normalization applied to array fields in toStringArrayOrNull.
    const s = value.replace(/\s+/g, " ").trim();
    return s ? s : null;
  }
  if (typeof value === "number" && !Number.isFinite(value)) return null;
  if (typeof value === "number") return String(value);
  return null;
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

  return "Custodial Only";
}

function parseChainAddressListToLabelMap(value: any): { [chainLabel: string]: string[] } | null {
  // Already in parsed { chainLabel: string[] } form (e.g. re-normalization of DB data) — return as-is
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const keys = Object.keys(value);
    if (keys.length && keys.every((k) => Array.isArray(value[k]))) return value;
  }

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
  // Collapse whitespace so exact-match checks against RWA_STABLECOIN_CATEGORIES
  // and RWA_GOVERNANCE_CATEGORIES Sets work even with messy Airtable input.
  const cleanStr = (s: string) => s.replace(/\s+/g, " ").trim();

  const normalizeStringList = (value: any): string[] => {
    if (!Array.isArray(value)) return [];
    return value
      .filter((v) => typeof v === "string")
      .map((v: string) => cleanStr(v))
      .filter(Boolean);
  };

  const categories = normalizeStringList(target?.category);
  const assetClasses = normalizeStringList(target?.assetClass);

  const classifications = Array.isArray(target?.rwaClassification)
    ? normalizeStringList(target?.rwaClassification)
    : typeof target?.rwaClassification === "string"
      ? [cleanStr(target.rwaClassification)].filter(Boolean)
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

  // Derive category flags — must run AFTER normalizeStringArrayFieldsInPlace so
  // that category/assetClass values have consistent whitespace for Set.has() checks.
  const flags = deriveStablecoinAndGovernanceFlags(target);
  target.stablecoin = flags.stablecoin;
  target.governance = flags.governance;

  // Normalize price
  if (!("price" in target)) target.price = null;
  target.price = toFiniteNumberOrNull(target.price);
  if (target.price != null) target.price = formatNumAsNumber(target.price);

  return target;
}


// ---------------------------------------------------------------------------
// Historical time-series smoothing
// ---------------------------------------------------------------------------

const DAY_SECONDS = 86400;

export interface HistoricalRecord {
  timestamp: number;
  onChainMcap: number;
  defiActiveTvl: number;
  activeMcap?: number;
}

const HISTORICAL_NUMERIC_KEYS: ReadonlyArray<keyof HistoricalRecord> = [
  'onChainMcap',
  'defiActiveTvl',
  'activeMcap',
];

// Maximum number of consecutive anomalous days to bridge over.
// Runs longer than this are treated as genuine level shifts.
const MAX_SPIKE_RUN = 5;

/**
 * Removes spikes and dips (including multi-day runs) from a sorted time series.
 *
 * For each metric the algorithm tracks the last known-good value and scans
 * forward.  When a point deviates by more than 10× or less than 10% of the
 * last good value, it marks the start of an anomalous run.  It then looks
 * ahead (up to MAX_SPIKE_RUN days) for the next point that is within 5× of
 * the last good value.  The entire run is replaced by linear interpolation
 * between the two good bookends.
 *
 * This correctly handles both isolated one-day dips *and* consecutive runs
 * (e.g. April 10 + 11 both missing price data).
 */
function removeSpikes(data: HistoricalRecord[]): HistoricalRecord[] {
  if (data.length < 3) return data.map((r) => ({ ...r }));

  const result = data.map((r) => ({ ...r }));

  for (const key of HISTORICAL_NUMERIC_KEYS) {
    let lastGoodIdx = 0;
    let i = 1;

    while (i < result.length) {
      const lastGoodVal = result[lastGoodIdx][key];
      const currVal = result[i][key];

      // Skip undefined / non-finite / near-zero reference values
      if (lastGoodVal === undefined || currVal === undefined ||
          !Number.isFinite(lastGoodVal) || !Number.isFinite(currVal)) {
        lastGoodIdx = i;
        i++;
        continue;
      }
      if (lastGoodVal < 1) {
        lastGoodIdx = i;
        i++;
        continue;
      }

      const ratio = currVal / lastGoodVal;
      if (ratio >= 0.1 && ratio <= 10) {
        // Consistent with last good value
        lastGoodIdx = i;
        i++;
        continue;
      }

      // Current point looks anomalous — scan ahead for next good reference
      let nextGoodIdx = -1;
      for (let j = i + 1; j < Math.min(i + MAX_SPIKE_RUN + 1, result.length); j++) {
        const jVal = result[j][key];
        if (jVal === undefined || !Number.isFinite(jVal)) break;
        const jRatio = jVal / lastGoodVal;
        if (jRatio >= 0.2 && jRatio <= 5) {
          nextGoodIdx = j;
          break;
        }
      }

      if (nextGoodIdx === -1) {
        // No good reference ahead within window — treat as genuine level shift
        lastGoodIdx = i;
        i++;
        continue;
      }

      // Linearly interpolate the entire anomalous run [i, nextGoodIdx)
      const prevTs = result[lastGoodIdx].timestamp;
      const nextTs = result[nextGoodIdx].timestamp;
      const prevVal = lastGoodVal;
      const nextVal = result[nextGoodIdx][key] as number;

      const isZeroDip = currVal < 1;
      for (let k = i; k < nextGoodIdx; k++) {
        const t = (result[k].timestamp - prevTs) / (nextTs - prevTs);
        const interpolated = prevVal + (nextVal - prevVal) * t;
        (result[k] as any)[key] = isZeroDip ? Math.max(interpolated, prevVal) : interpolated;
      }

      lastGoodIdx = nextGoodIdx;
      i = nextGoodIdx + 1;
    }
  }

  return result;
}

/**
 * Inserts linearly-interpolated records for any gaps larger than one day.
 * Mirrors the approach used in getCategories.ts for protocol TVL.
 */
function fillGaps(data: HistoricalRecord[]): HistoricalRecord[] {
  if (data.length < 2) return [...data];

  const result: HistoricalRecord[] = [];

  for (let i = 0; i < data.length; i++) {
    result.push(data[i]);

    if (i < data.length - 1) {
      const curr = data[i];
      const next = data[i + 1];
      const daysDiff = Math.round((next.timestamp - curr.timestamp) / DAY_SECONDS);

      for (let j = 1; j < daysDiff; j++) {
        const fraction = j / daysDiff;
        const interpolated: HistoricalRecord = {
          timestamp: curr.timestamp + DAY_SECONDS * j,
          onChainMcap: curr.onChainMcap + (next.onChainMcap - curr.onChainMcap) * fraction,
          defiActiveTvl: curr.defiActiveTvl + (next.defiActiveTvl - curr.defiActiveTvl) * fraction,
        };
        if (curr.activeMcap !== undefined && next.activeMcap !== undefined) {
          interpolated.activeMcap = curr.activeMcap + (next.activeMcap - curr.activeMcap) * fraction;
        }
        result.push(interpolated);
      }
    }
  }

  return result;
}

/**
 * Smooths RWA historical chart data:
 *   1. Removes spikes/dips — including runs of up to 5 consecutive bad days
 *      (e.g. missing price or TVL data on Apr 10 + 11).
 *   2. Fills any multi-day gaps with linear interpolation.
 *
 * Safe to call on already-sorted or unsorted data; returns a new sorted array.
 */
export function smoothHistoricalData(data: HistoricalRecord[]): HistoricalRecord[] {
  if (!data || data.length < 2) return data;
  const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
  return fillGaps(removeSpikes(sorted));
}

// ---------------------------------------------------------------------------

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
