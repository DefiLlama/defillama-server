import { perpsSlug } from "./utils";

export function resolvePerpsLookupId(idMap: Record<string, string> | null | undefined, input: string): string | null {
    if (!input) return null;

    const normalizedInput = String(input).toLowerCase();
    if (idMap?.[normalizedInput]) return idMap[normalizedInput];

    const sluggedInput = perpsSlug(input);
    if (sluggedInput && idMap?.[sluggedInput]) return idMap[sluggedInput];

    return normalizedInput;
}

export function findMarketById(currentData: any[], id: string) {
    const idParam = String(id).toLowerCase();
    return currentData.find((item: any) =>
        typeof item?.id !== "undefined" && String(item.id).toLowerCase() === idParam
    );
}

export function findMarketsByContract(currentData: any[], contract: string): any[] {
    const contractSlug = perpsSlug(contract);
    return currentData.filter((item: any) =>
        typeof item?.contract !== "undefined" && perpsSlug(item.contract) === contractSlug
    );
}

export function findMarketsByVenue(currentData: any[], venue: string): any[] {
    const venueSlug = perpsSlug(venue);
    return currentData.filter((item: any) => perpsSlug(item.venue) === venueSlug);
}

export function findMarketsByCategory(currentData: any[], category: string): any[] {
    const slugCategory = perpsSlug(category);
    return currentData.filter((item: any) => {
        const categories = Array.isArray(item.category) ? item.category : [item.category || "Other"];
        return categories.some((cat: string) => perpsSlug(cat) === slugCategory);
    });
}
