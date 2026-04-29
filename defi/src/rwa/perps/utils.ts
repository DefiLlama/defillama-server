export function toFiniteNumberOrZero(value: any): number {
    const num = typeof value === "number" ? value : Number(value);
    return Number.isFinite(num) ? num : 0;
}

export const PREVIOUS_CHANGE_LOOKUP_TOLERANCE_SECONDS = 2 * 60 * 60;

export function getPercentChangeOrNull(currentValue: unknown, previousValue: unknown): number | null {
    const current = typeof currentValue === "number" ? currentValue : Number(currentValue);
    const previous = typeof previousValue === "number" ? previousValue : Number(previousValue);

    if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
        return null;
    }

    const percentChange = ((current - previous) / previous) * 100;
    return Number.isFinite(percentChange) ? percentChange : null;
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
