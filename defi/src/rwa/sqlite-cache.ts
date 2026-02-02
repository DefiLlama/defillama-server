import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Bump this version to reset the cache
export const CACHE_VERSION = 'v2.0';

const CACHE_DIR = process.env.RWA_CACHE_DIR || path.join(__dirname, '.rwa-cache');
const DB_PATH = path.join(CACHE_DIR, 'rwa.db');

let db: Database.Database | null = null;

function ensureCacheDirExists(): void {
    if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
}

/**
 * Initialize the SQLite database and create tables if they don't exist.
 * Must be called before using any other cache functions.
 */
export function initCache(): void {
    if (db) return;

    ensureCacheDirExists();

    db = new Database(DB_PATH);

    // Enable WAL mode for better concurrent read performance
    db.pragma('journal_mode = WAL');

    // Create tables
    db.exec(`
        -- Route data (current.json, list.json, stats.json, id-map.json)
        CREATE TABLE IF NOT EXISTS route_data (
            key TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        );

        -- Chart data (charts/chain/*, charts/category/*, charts/platform/*)
        CREATE TABLE IF NOT EXISTS chart_data (
            type TEXT NOT NULL,
            name TEXT NOT NULL,
            data TEXT NOT NULL,
            updated_at INTEGER DEFAULT (strftime('%s', 'now')),
            PRIMARY KEY (type, name)
        );

        -- PG cache (per-asset time-series with chain breakdown)
        CREATE TABLE IF NOT EXISTS pg_cache (
            asset_id TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            on_chain_mcap REAL NOT NULL,
            active_mcap REAL NOT NULL,
            defi_active_tvl REAL NOT NULL,
            chains TEXT NOT NULL,
            PRIMARY KEY (asset_id, timestamp)
        );

        -- Sync metadata
        CREATE TABLE IF NOT EXISTS sync_metadata (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        -- Indexes for common queries
        CREATE INDEX IF NOT EXISTS idx_pg_cache_asset ON pg_cache(asset_id);
        CREATE INDEX IF NOT EXISTS idx_chart_type ON chart_data(type);
    `);

    console.log('SQLite cache initialized at:', DB_PATH);
}

/**
 * Close the database connection.
 * Should be called when shutting down.
 */
export function closeCache(): void {
    if (db) {
        db.close();
        db = null;
        console.log('SQLite cache closed');
    }
}

function getDb(): Database.Database {
    if (!db) {
        throw new Error('Cache not initialized. Call initCache() first.');
    }
    return db;
}

// Normalize file paths/keys for consistency
export const fileNameNormalizer = (fileName: string) =>
    decodeURIComponent(fileName).replace(/[^a-zA-Z0-9\/\.\-_]/g, '').toLowerCase();

// ============================================================================
// Route Data Functions
// ============================================================================

/**
 * Store route data (e.g., current.json, list.json, stats.json, id-map.json)
 */
export async function storeRouteData(subPath: string, data: any): Promise<void> {
    const key = fileNameNormalizer(`build/${subPath}`);
    const database = getDb();

    const stmt = database.prepare(`
        INSERT INTO route_data (key, data, updated_at)
        VALUES (?, ?, strftime('%s', 'now'))
        ON CONFLICT(key) DO UPDATE SET
            data = excluded.data,
            updated_at = excluded.updated_at
    `);

    // Check if this is chart data and store appropriately
    if (key.startsWith('build/charts/')) {
        const parts = key.replace('build/charts/', '').replace('.json', '').split('/');
        if (parts.length === 2) {
            const [type, name] = parts;
            await storeChartData(type, name, data);
            return;
        }
    }

    stmt.run(key, JSON.stringify(data));
}

/**
 * Read route data
 */
export async function readRouteData(subPath: string, options: {
    skipErrorLog?: boolean;
    readAsArrayBuffer?: boolean;
} = {}): Promise<any> {
    const { skipErrorLog = false, readAsArrayBuffer = false } = options;
    const key = fileNameNormalizer(`build/${subPath}`);

    try {
        const database = getDb();

        // Check if this is chart data
        if (key.startsWith('build/charts/')) {
            const parts = key.replace('build/charts/', '').replace('.json', '').split('/');
            if (parts.length === 2) {
                const [type, name] = parts;
                return await readChartData(type, name);
            }
        }

        const stmt = database.prepare('SELECT data FROM route_data WHERE key = ?');
        const row = stmt.get(key) as { data: string } | undefined;

        if (!row) {
            return null;
        }

        if (readAsArrayBuffer) {
            return Buffer.from(row.data, 'utf8');
        }

        return JSON.parse(row.data);
    } catch (e) {
        if (!skipErrorLog) {
            console.error(`Error reading route data ${key}:`, (e as any)?.message);
        }
        return null;
    }
}

// ============================================================================
// Chart Data Functions
// ============================================================================

/**
 * Store chart data by type (chain, category, platform) and name
 */
export async function storeChartData(type: string, name: string, data: any): Promise<void> {
    const database = getDb();

    const stmt = database.prepare(`
        INSERT INTO chart_data (type, name, data, updated_at)
        VALUES (?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(type, name) DO UPDATE SET
            data = excluded.data,
            updated_at = excluded.updated_at
    `);

    stmt.run(type, name, JSON.stringify(data));
}

/**
 * Read chart data by type and name
 */
export async function readChartData(type: string, name: string): Promise<any> {
    const database = getDb();

    const stmt = database.prepare('SELECT data FROM chart_data WHERE type = ? AND name = ?');
    const row = stmt.get(type, name) as { data: string } | undefined;

    if (!row) {
        return null;
    }

    return JSON.parse(row.data);
}

// ============================================================================
// PG Cache Functions
// ============================================================================

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

/**
 * Store PG cache data for a specific asset ID.
 * This stores each timestamp as a separate row for efficient range queries.
 */
export async function storePGCacheForId(id: string, data: PGCacheData): Promise<void> {
    const database = getDb();

    const insertStmt = database.prepare(`
        INSERT INTO pg_cache (asset_id, timestamp, on_chain_mcap, active_mcap, defi_active_tvl, chains)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(asset_id, timestamp) DO UPDATE SET
            on_chain_mcap = excluded.on_chain_mcap,
            active_mcap = excluded.active_mcap,
            defi_active_tvl = excluded.defi_active_tvl,
            chains = excluded.chains
    `);

    const insertMany = database.transaction((records: Array<[string, number, number, number, number, string]>) => {
        for (const record of records) {
            insertStmt.run(...record);
        }
    });

    const records: Array<[string, number, number, number, number, string]> = [];
    for (const [timestampStr, record] of Object.entries(data)) {
        const timestamp = Number(timestampStr);
        records.push([
            id,
            timestamp,
            record.onChainMcap,
            record.activeMcap,
            record.defiActiveTvl,
            JSON.stringify(record.chains),
        ]);
    }

    insertMany(records);
}

/**
 * Read PG cache data for a specific asset ID.
 * Returns data in the same format as the file-based cache.
 */
export async function readPGCacheForId(id: string): Promise<PGCacheData | null> {
    const database = getDb();

    const stmt = database.prepare(`
        SELECT timestamp, on_chain_mcap, active_mcap, defi_active_tvl, chains
        FROM pg_cache
        WHERE asset_id = ?
        ORDER BY timestamp
    `);

    const rows = stmt.all(id) as Array<{
        timestamp: number;
        on_chain_mcap: number;
        active_mcap: number;
        defi_active_tvl: number;
        chains: string;
    }>;

    if (rows.length === 0) {
        return null;
    }

    const data: PGCacheData = {};
    for (const row of rows) {
        data[row.timestamp] = {
            onChainMcap: row.on_chain_mcap,
            activeMcap: row.active_mcap,
            defiActiveTvl: row.defi_active_tvl,
            chains: JSON.parse(row.chains),
        };
    }

    return data;
}

/**
 * Merge existing PG cache data with new records.
 */
export function mergePGCacheData(existing: PGCacheData | null, newRecords: PGCacheData): PGCacheData {
    if (!existing) return newRecords;
    return { ...existing, ...newRecords };
}

// ============================================================================
// Sync Metadata Functions
// ============================================================================

interface SyncMetadata {
    lastSyncTimestamp: string | null;
    lastSyncDate: string;
    totalIds: number;
}

/**
 * Get sync metadata
 */
export async function getSyncMetadata(): Promise<SyncMetadata | null> {
    const database = getDb();

    const stmt = database.prepare('SELECT value FROM sync_metadata WHERE key = ?');
    const row = stmt.get('sync_metadata') as { value: string } | undefined;

    if (!row) {
        return null;
    }

    return JSON.parse(row.value);
}

/**
 * Set sync metadata
 */
export async function setSyncMetadata(metadata: SyncMetadata): Promise<void> {
    const database = getDb();

    const stmt = database.prepare(`
        INSERT INTO sync_metadata (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    stmt.run('sync_metadata', JSON.stringify(metadata));
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the current cache version
 */
export function getCacheVersion(): string {
    return CACHE_VERSION;
}

/**
 * Get the cache directory path
 */
export function getCacheDir(): string {
    return CACHE_DIR;
}

/**
 * Clear old cache versions (both JSON folders and old DB files if any)
 */
export async function clearOldCacheVersions(): Promise<void> {
    try {
        if (!fs.existsSync(CACHE_DIR)) {
            return;
        }

        const entries = fs.readdirSync(CACHE_DIR, { withFileTypes: true });

        // Remove old versioned folders (from file-cache era)
        const versionFolders = entries
            .filter((entry) => entry.isDirectory() && entry.name.startsWith('v'))
            .map((entry) => entry.name);

        for (const folder of versionFolders) {
            const folderPath = path.join(CACHE_DIR, folder);
            fs.rmSync(folderPath, { recursive: true, force: true });
            console.log(`Deleted old cache version folder: ${folder}`);
        }
    } catch (e) {
        console.error('Error clearing old cache versions:', (e as any)?.message);
    }
}

/**
 * Get all file subpaths (for compatibility with existing code)
 * Returns chart data entries of the specified type
 */
export function getAllFileSubpathsSync(folder: string, _isAbsolutePath = false): Set<string> {
    try {
        const subpaths: Set<string> = new Set();

        if (!db) {
            return subpaths;
        }

        // Parse folder to determine chart type
        if (folder.startsWith('charts/')) {
            const type = folder.replace('charts/', '').replace('/', '');
            const stmt = db.prepare('SELECT name FROM chart_data WHERE type = ?');
            const rows = stmt.all(type) as Array<{ name: string }>;
            for (const row of rows) {
                subpaths.add(`${row.name}.json`);
            }
        }

        return subpaths;
    } catch (e) {
        console.error('Error reading chart entries:', folder, (e as any)?.message);
        return new Set();
    }
}

// For backwards compatibility - export ROUTES_DATA_DIR (though not used with SQLite)
export const ROUTES_DATA_DIR = path.join(CACHE_DIR, 'build');
