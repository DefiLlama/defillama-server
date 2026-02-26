import fs from 'fs';
import path from 'path';

// Bump this version to reset the cache
const CACHE_VERSION = 'v2.0';

const CACHE_DIR = process.env.RWA_CACHE_DIR || path.join(__dirname, '.rwa-cache');
const VERSIONED_CACHE_DIR = path.join(CACHE_DIR, CACHE_VERSION);
export const ROUTES_DATA_DIR = path.join(VERSIONED_CACHE_DIR, 'build');

const pathExistsMap: { [key: string]: Promise<void> } = {};

async function ensureDirExists(folder: string): Promise<void> {
    if (!pathExistsMap[folder]) {
        pathExistsMap[folder] = createPathIfMissing();
    }
    return pathExistsMap[folder];

    async function createPathIfMissing() {
        try {
            await fs.promises.access(folder);
        } catch {
            try {
                await fs.promises.mkdir(folder, { recursive: true });
            } catch (e) {
                console.error('Error creating directory:', (e as any)?.message);
            }
        }
    }
}

export const fileNameNormalizer = (fileName: string) =>
    decodeURIComponent(fileName).replace(/[^a-zA-Z0-9\/\.\-_]/g, '').toLowerCase();

export async function storeRouteData(subPath: string, data: any): Promise<void> {
    subPath = fileNameNormalizer(`build/${subPath}`);
    return storeData(subPath, data);
}

export async function readRouteData(subPath: string, options: {
    skipErrorLog?: boolean;
    readAsArrayBuffer?: boolean;
} = {}): Promise<any> {
    subPath = fileNameNormalizer(`build/${subPath}`);
    return readFileData(subPath, options);
}

async function storeData(subPath: string, data: any): Promise<void> {
    const filePath = path.join(VERSIONED_CACHE_DIR, subPath);
    const dirPath = path.dirname(filePath);
    await ensureDirExists(dirPath);
    try {
        await fs.promises.writeFile(filePath, JSON.stringify(data));
    } catch (e) {
        console.error(`Error storing data to ${filePath}:`, (e as any)?.message);
    }
}

async function readFileData(subPath: string, options: {
    skipErrorLog?: boolean;
    readAsArrayBuffer?: boolean;
} = {}): Promise<any> {
    const { skipErrorLog = false, readAsArrayBuffer = false } = options;
    const filePath = path.join(VERSIONED_CACHE_DIR, subPath);
    try {
        const data = await fs.promises.readFile(filePath, readAsArrayBuffer ? null : 'utf8');
        if (readAsArrayBuffer) return data;
        return JSON.parse(data.toString());
    } catch (e) {
        if (!skipErrorLog) {
            console.error(`Error reading file ${filePath}:`, (e as any)?.message);
        }
        return null;
    }
}

export function getAllFileSubpathsSync(folder: string, isAbsolutePath = false): Set<string> {
    try {
        const subpaths: Set<string> = new Set();
        if (!isAbsolutePath) {
            folder = path.join(ROUTES_DATA_DIR, folder);
        }

        const files = fs.readdirSync(folder, { withFileTypes: true });
        for (const file of files) {
            const filePath = path.join(folder, file.name);
            if (file.isDirectory()) {
                const subfolderSubpaths = getAllFileSubpathsSync(filePath, true);
                for (const subpath of subfolderSubpaths) {
                    subpaths.add(path.join(file.name, subpath));
                }
            } else {
                subpaths.add(file.name);
            }
        }
        return subpaths;
    } catch (e) {
        console.error('Error reading folder:', folder, (e as any)?.message);
        return new Set();
    }
}

export function getCacheDir(): string {
    return VERSIONED_CACHE_DIR;
}

export function getCacheVersion(): string {
    return CACHE_VERSION;
}

// Sync metadata for tracking incremental updates
const SYNC_METADATA_FILE = 'sync-metadata.json';
const PG_SYNC_METADATA_FILE = 'pg_sync-metadata.json';

interface SyncMetadata {
    lastSyncTimestamp: string | null;
    lastSyncDate: string;
    totalIds: number;
}

export async function getSyncMetadata(): Promise<SyncMetadata | null> {
    const data = await readRouteData(SYNC_METADATA_FILE, { skipErrorLog: true });
    return data;
}

export async function setSyncMetadata(metadata: SyncMetadata): Promise<void> {
    await storeRouteData(SYNC_METADATA_FILE, metadata);
}


export async function getPGSyncMetadata(): Promise<SyncMetadata | null> {
    const data = await readRouteData(PG_SYNC_METADATA_FILE, { skipErrorLog: true });
    return data;
}

export async function setPGSyncMetadata(metadata: SyncMetadata): Promise<void> {
    await storeRouteData(PG_SYNC_METADATA_FILE, metadata);
}


// Historical data per ID
export async function storeHistoricalDataForId(id: string, data: any[]): Promise<void> {
    await storeRouteData(`charts/${id}.json`, data);
}

export async function readHistoricalDataForId(id: string): Promise<any[] | null> {
    const result = await readRouteData(`charts/${id}.json`, { skipErrorLog: true });
    return result?.data || null;
}

export function mergeHistoricalData(
    existingData: any[] | null,
    newRecords: any[]
): any[] {
    if (!existingData || existingData.length === 0) {
        return newRecords;
    }

    // Create a map of existing records by timestamp for quick lookup
    const dataMap = new Map<number, any>();
    existingData.forEach((record) => {
        dataMap.set(record.timestamp, record);
    });

    // Merge/update with new records
    newRecords.forEach((record) => {
        dataMap.set(record.timestamp, record);
    });

    // Convert back to sorted array
    const merged = Array.from(dataMap.values());
    merged.sort((a, b) => a.timestamp - b.timestamp);

    return merged;
}

// PG Cache - stores asset data with chain breakdown (chain keys), keyed by timestamp
export interface PGCacheRecord {
    onChainMcap: number;
    activeMcap: number;
    defiActiveTvl: number;
    chains: {
        [chainKey: string]: {
            onChainMcap: number;
            activeMcap: number;
            defiActiveTvl: number;
        };
    };
}

export type PGCacheData = { [timestamp: number]: PGCacheRecord };

export async function storePGCacheForId(id: string, data: PGCacheData): Promise<void> {
    const subPath = fileNameNormalizer(`pg-cache/${id}.json`);
    return storeData(subPath, data);
}

export async function readPGCacheForId(id: string): Promise<PGCacheData | null> {
    const subPath = fileNameNormalizer(`pg-cache/${id}.json`);
    return readFileData(subPath, { skipErrorLog: true });
}

export function mergePGCacheData(existing: PGCacheData | null, newRecords: PGCacheData): PGCacheData {
    if (!existing) return newRecords;
    return { ...existing, ...newRecords };
}

export async function clearOldCacheVersions(): Promise<void> {
    try {
        const entries = fs.readdirSync(CACHE_DIR, { withFileTypes: true });
        const versionFolders = entries
            .filter((entry) => entry.isDirectory() && entry.name.startsWith('v'))
            .map((entry) => entry.name);

        for (const folder of versionFolders) {
            if (folder !== CACHE_VERSION) {
                const folderPath = path.join(CACHE_DIR, folder);
                fs.rmSync(folderPath, { recursive: true, force: true });
                console.log(`Deleted old cache version: ${folder}`);
            }
        }
    } catch (e) {
        console.error('Error clearing old cache versions:', (e as any)?.message);
    }
}
