import protocols from "../../src/protocols/data";
import parentProtocols from "../../src/protocols/parentProtocols";
import { DEDUP_FIELDS } from "./mergeData";

const API_URL = "https://api.llama.fi/_fe/static/configs";

// These fields are updated in index.ts's `setProtocolMetadata()` function 
// Neither `removeNullData.ts` or `mergeData.ts` edit these values
const IGNORED_FIELDS = new Set(["methodology", "hallmarks", "misrepresentedTokens", "deadFrom", "doublecounted", "category", "tags"]);

// Compare a single field, return diff string or null
function compareField(key: string, apiVal: any, localVal: any): string | null {
    const apiStr = JSON.stringify(apiVal ?? null);
    const localStr = JSON.stringify(localVal ?? null);

    if (apiStr !== localStr) {

        // Account for empty `forkedFrom` arrays that were removed locally
        if (key == 'forkedFrom' && apiStr === '[]' && localStr == 'null') return null;

        // Account for children inheriting missing fields from parents
        if (apiStr === 'null' && localStr !== 'null' && DEDUP_FIELDS.includes(key)) return null;

        // Account for symbols set to "-" changed to null (or set to parent value)
        if (apiStr == '"-"') return null;
        return `  ${key}: API=${apiStr.slice(0, 80)} -> LOCAL=${localStr.slice(0, 80)}`;
    }
    return null;
}

// Compares two protocol objects and returns differences
function compareProtocol(api: any, local: any): string[] {
    const diffs: string[] = [];
    const allKeys = new Set([...Object.keys(api || {}), ...Object.keys(local || {})]);

    for (const key of allKeys) {
        if (IGNORED_FIELDS.has(key)) continue;
        const diff = compareField(key, api?.[key], local?.[key]);
        if (diff) diffs.push(diff);
    }
    return diffs;
}

async function fetchApiConfigs(): Promise<{ protocols: any[]; parentProtocols: any[] }> {
    const response = await fetch(API_URL);
    if (!response.ok) {
        throw new Error(`Failed to fetch API: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

async function main() {
    console.log(`Protocol Comparison: Local vs API\n`);
    console.log(`Local: ${protocols.length} protocols, ${parentProtocols.length} parents`);

    const apiData = await fetchApiConfigs();
    console.log(`API: ${apiData.protocols.length} protocols, ${apiData.parentProtocols.length} parents\n`);

    const apiById = new Map(apiData.protocols.map((p: any) => [p.id, p]));
    const localById = new Map(protocols.map(p => [p.id, p]));

    let totalDiffs = 0;
    const maxShow = 20;

    // Compare protocols that exist in both
    for (const local of protocols) {
        const api = apiById.get(local.id);

        if (!api) {
            if (totalDiffs < maxShow) console.log(`NEW (not in API): ${local.id} (${local.name})`);
            totalDiffs++;
            continue;
        }

        const diffs = compareProtocol(api, local);
        if (diffs.length > 0) {
            if (totalDiffs < maxShow) {
                console.log(`DIFF: ${local.id} (${local.name}):`);
                diffs.slice(0, 5).forEach(d => console.log(d));
                if (diffs.length > 5) console.log(`  ... +${diffs.length - 5} more fields`);
            }
            totalDiffs++;
        }
    }

    // Check for protocols in API that arent in local files
    for (const [id, api] of apiById) {
        if (!localById.has(id)) {
            if (totalDiffs < maxShow) console.log(`MISSING LOCALLY: ${id} (${api.name})`);
            totalDiffs++;
        }
    }

    // Compare parent protocols
    const apiParentsById = new Map(apiData.parentProtocols.map((p: any) => [p.id, p]));
    const localParentsById = new Map(parentProtocols.map(p => [p.id, p]));

    for (const local of parentProtocols) {
        const api = apiParentsById.get(local.id);
        if (api) {
            const diffs = compareProtocol(api, local);
            if (diffs.length > 0) {
                if (totalDiffs < maxShow) {
                    console.log(`PARENT DIFF: ${local.id} (${local.name}):`);
                    diffs.slice(0, 3).forEach(d => console.log(d));
                }
                totalDiffs++;
            }
        }
    }
    // Check for parent protocols in API that arent in local files
    for (const [id, api] of apiParentsById) {
        if (!localParentsById.has(id)) {
            if (totalDiffs < maxShow) console.log(`MISSING PARENT LOCALLY: ${id} (${api.name})`);
            totalDiffs++;
        }
    }

    console.log(`\n${"=".repeat(50)}`);
    if (totalDiffs === 0) {
        console.log(`No differences found - local matches API`);
    } else {
        console.log(`${totalDiffs} differences found`);
    }
}

main();