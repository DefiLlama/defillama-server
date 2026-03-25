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

export function toFixedNumber(value: any, decimals: number = 0): number {
    const d = Number.isFinite(decimals) ? decimals : 0;
    if (value == null) return 0;
    try {
        if (typeof value === "number") return Number(value.toFixed(d));
        if (typeof (value as any)?.toFixed === "function") {
            const fixed = (value as any).toFixed(d);
            const parsed = Number(fixed);
            return Number.isFinite(parsed) ? parsed : 0;
        }
        const num = Number(value);
        if (!Number.isFinite(num)) return 0;
        return Number(num.toFixed(d));
    } catch {
        return 0;
    }
}

const LEADING_DASH_REGEX = /^-+/;
const TRAILING_DASH_REGEX = /-+$/;
const NON_WORD_REGEX = /[^\w]+/g;
const MULTI_DASH_REGEX = /-+/g;

const safeDecode = (input: string) => {
    try {
        return decodeURIComponent(input);
    } catch {
        return input;
    }
};

export const perpsSlug = (input = ""): string => {
    const normalized = safeDecode(String(input)).toLowerCase().trim();
    return normalized
        .replace(NON_WORD_REGEX, "-")
        .replace(MULTI_DASH_REGEX, "-")
        .replace(LEADING_DASH_REGEX, "")
        .replace(TRAILING_DASH_REGEX, "");
};

// Compute estimated protocol fees from volume
export function computeProtocolFees(
    volume: number,
    takerFeeRate: number,
    deployerShare: number
): number {
    return volume * takerFeeRate * deployerShare;
}

// Format percentage with sign
export function formatPercentage(value: number, decimals: number = 4): string {
    if (!Number.isFinite(value)) return "0%";
    return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

// Group an array of items by a key function
export function groupBy<T>(items: T[], keyFn: (item: T) => string): { [key: string]: T[] } {
    const groups: { [key: string]: T[] } = {};
    for (const item of items) {
        const key = keyFn(item);
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    }
    return groups;
}
