import { chainsThatShouldNotBeLowerCased } from "../utils/shared/constants";

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
