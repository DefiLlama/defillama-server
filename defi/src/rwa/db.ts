import { getCurrentUnixTimestamp, getTimestampAtStartOfDay, secondsInDay } from "../../src/utils/date";
import { DataTypes, Model, Op, QueryTypes, Sequelize } from 'sequelize'

class META_RWA_DATA extends Model { }
export class DAILY_RWA_DATA extends Model { }
export class HOURLY_RWA_DATA extends Model { }
class BACKUP_RWA_DATA extends Model { }

let pgConnection: any;

const twoDaysAgo = getTimestampAtStartOfDay(getCurrentUnixTimestamp() - 2 * secondsInDay);

// Initialize the database tables
async function initPGTables() {
    HOURLY_RWA_DATA.init({
        timestamp: {
            type: DataTypes.INTEGER,
            primaryKey: true,
        },
        id: {
            type: DataTypes.STRING,
            primaryKey: true,
        },
        defiactivetvl: {
            type: DataTypes.TEXT,
        },
        mcap: {
            type: DataTypes.TEXT,
        },
        activemcap: {
            type: DataTypes.TEXT,
        },
        aggregatedefiactivetvl: {
            type: DataTypes.DECIMAL,
        },
        aggregatemcap: {
            type: DataTypes.DECIMAL,
        },
        aggregatedactivemcap: {
            type: DataTypes.DECIMAL,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    }, {
        sequelize: pgConnection,
        timestamps: false,
        tableName: 'hourly_rwa_data',
        indexes: [
            { name: 'activetvls_id_index', fields: ['id'], },
            { name: 'activetvls_timestamp_index', fields: ['timestamp'], },
            { name: 'hourly_rwa_data_updated_at_index', fields: ['updated_at'], },
        ]
    });

    DAILY_RWA_DATA.init({
        timestamp: {
            type: DataTypes.INTEGER,
            primaryKey: true,
        },
        id: {
            type: DataTypes.STRING,
            primaryKey: true,
        },
        timestamp_actual: {
            type: DataTypes.INTEGER,
        },
        defiactivetvl: {
            type: DataTypes.TEXT,
        },
        mcap: {
            type: DataTypes.TEXT,
        },
        activemcap: {
            type: DataTypes.TEXT,
        },
        aggregatedefiactivetvl: {
            type: DataTypes.DECIMAL,
        },
        aggregatemcap: {
            type: DataTypes.DECIMAL,
        },
        aggregatedactivemcap: {
            type: DataTypes.DECIMAL,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    }, {
        sequelize: pgConnection,
        timestamps: false,
        tableName: 'daily_rwa_data',
        indexes: [
            { name: 'activetvls_id_index', fields: ['id'], },
            { name: 'activetvls_timestamp_index', fields: ['timestamp'], },
            { name: 'daily_rwa_data_updated_at_index', fields: ['updated_at'], },
        ]
    });

    BACKUP_RWA_DATA.init({
        timestamp: {
            type: DataTypes.INTEGER,
            primaryKey: true,
        },
        id: {
            type: DataTypes.STRING,
            primaryKey: true,
        },
        defiactivetvl: {
            type: DataTypes.TEXT,
        },
        mcap: {
            type: DataTypes.TEXT,
        },
        activemcap: {
            type: DataTypes.TEXT,
        },
        aggregatedefiactivetvl: {
            type: DataTypes.DECIMAL,
        },
        aggregatemcap: {
            type: DataTypes.DECIMAL,
        },
        aggregatedactivemcap: {
            type: DataTypes.DECIMAL,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    }, {
        sequelize: pgConnection,
        timestamps: false,
        tableName: 'backup_rwa_data',
        indexes: [
            { name: 'activetvlsbackup_id_index', fields: ['id'], },
            { name: 'activetvlsbackup_timestamp_index', fields: ['timestamp'], },
            { name: 'backup_rwa_data_updated_at_index', fields: ['updated_at'], },
        ]
    });

    META_RWA_DATA.init({
        id: {
            type: DataTypes.STRING,
            primaryKey: true,
        },
        data: {
            type: DataTypes.JSON,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    }, {
        sequelize: pgConnection,
        timestamps: false,
        tableName: 'meta_rwa_data',
        indexes: [
            { name: 'meta_rwa_id_index', fields: ['id'], },
            { name: 'meta_rwa_data_updated_at_index', fields: ['updated_at'], },
        ]
    });
}
// Initialize the database connection
async function initializeRwaDB(): Promise<void> {
    if (!pgConnection) {
        const auth = process.env.COINS2_AUTH?.split(",") ?? [];
        if (!auth || auth.length != 3) throw new Error("there aren't 3 auth params");

        pgConnection = new Sequelize(auth[0], {
            logging: false,
        });
        initPGTables()
    }
}
// Get the database connection
function getPGConnection(): Sequelize {
    return pgConnection
}
// Initialize the database connection
export async function initPG(): Promise<void> {
    if (pgConnection) return;
    await initializeRwaDB();
    pgConnection = getPGConnection();
}
// Find records where timestamp equals the target timestamp, one per id
export async function findDailyTimestampRecords(targetTimestamp: number): Promise<{ [id: string]: { timestamp: number; timestamp_actual: number } }> {
    // Find records where timestamp equals the target timestamp, one per id
    const records = await DAILY_RWA_DATA.sequelize!.query(
        `SELECT DISTINCT ON (id) id, timestamp, timestamp_actual
         FROM "${DAILY_RWA_DATA.getTableName()}"
         WHERE timestamp = ${targetTimestamp}
         ORDER BY id, timestamp`,
        { type: QueryTypes.SELECT }
    ) as Array<{
        id: string;
        timestamp: number;
        timestamp_actual: number;
    }>;

    // Return as object mapping id to record for easy lookup
    const result: { [id: string]: { timestamp: number; timestamp_actual: number } } = {};
    records.forEach((record) => {
        result[record.id] = {
            timestamp: record.timestamp,
            timestamp_actual: record.timestamp_actual
        };
    });

    return result;
}
// Store historical data
export async function storeHistoricalPG(inserts: any, timestamp: number): Promise<void> {
    const dayTimestamp = getTimestampAtStartOfDay(timestamp);
    const closestRecord = await findDailyTimestampRecords(dayTimestamp);
    const now = new Date();

    // When refilling, fetch existing records so non-historical chain data can be preserved
    let existingRecords: { [id: string]: any } = {};
    if (process.env.RWA_REFILL) {
        const insertIds = inserts.map((i: any) => i.id);
        const existing = await DAILY_RWA_DATA.findAll({
            attributes: ['id', 'mcap', 'activemcap', 'defiactivetvl'],
            where: { timestamp: dayTimestamp, id: insertIds },
            raw: true,
        }) as any[];
        existing.forEach((r: any) => { existingRecords[r.id] = r; });
    }

    const dailyInserts: any[] = [];
    inserts.forEach((i: any) => {
        const { id, timestamp } = i;
        const closestRecordData = closestRecord[id];
        let insert = {
            ...i,
            timestamp: dayTimestamp,
            timestamp_actual: timestamp,
            created_at: i.created_at ?? now,
            updated_at: now,
        };

        if (process.env.RWA_REFILL_INCLUSIVE == 'true' || !closestRecordData) {
            // Merge non-historical chain data from the existing DB record into the new insert
            if (existingRecords[id]) {
                const existing = existingRecords[id];
                const merged: any = { ...insert };
                let additionalMcap = 0;
                let additionalActiveMcap = 0;
                let additionalDefiActiveTvl = 0;

                for (const field of ['mcap', 'activemcap', 'defiactivetvl'] as const) {
                    try {
                        const newData = JSON.parse(insert[field] ?? '{}');
                        const existingData = JSON.parse(existing[field] ?? '{}');
                        // Preserve existing chain data when new data is missing — covers both
                        // non-historical chains and any chain where the RPC failed during refill
                        for (const chain of Object.keys(existingData)) {
                            if (newData[chain] === undefined) {
                                console.log(`COMMUTITIVE REFILL ON ID: ${id}, timestamp: ${timestamp}`)

                                newData[chain] = existingData[chain];
                                if (field === 'mcap') additionalMcap += Number(existingData[chain]) || 0;
                                else if (field === 'activemcap') additionalActiveMcap += Number(existingData[chain]) || 0;
                                else if (field === 'defiactivetvl') {
                                    const nested = existingData[chain];
                                    if (nested && typeof nested === 'object') {
                                        additionalDefiActiveTvl += Object.values(nested).reduce((s: number, v: any) => s + (Number(v) || 0), 0);
                                    }
                                }
                            }
                        }
                        merged[field] = JSON.stringify(newData);
                    } catch { /* keep original if parse fails */ }
                }

                merged.aggregatemcap = (insert.aggregatemcap || 0) + additionalMcap;
                merged.aggregatedactivemcap = (insert.aggregatedactivemcap || 0) + additionalActiveMcap;
                merged.aggregatedefiactivetvl = (insert.aggregatedefiactivetvl || 0) + additionalDefiActiveTvl;
                insert = merged;
            }
            dailyInserts.push(insert);
        }
        else if (Math.abs(dayTimestamp - closestRecordData.timestamp_actual) > Math.abs(dayTimestamp - timestamp)) dailyInserts.push(insert);
    })

    // Add created_at (if missing) and updated_at to all inserts for hourly and backup tables
    const insertsWithTimestamp = inserts.map((i: any) => ({
        ...i,
        created_at: i.created_at ?? now,
        updated_at: now,
    }));

    const updateOnDuplicate = ['defiactivetvl', 'mcap', 'activemcap', 'aggregatedefiactivetvl', 'aggregatemcap', 'aggregatedactivemcap', 'timestamp_actual', 'updated_at'];

    // Bulk insert with conflict handling - overwrite on duplicate
    await DAILY_RWA_DATA.bulkCreate(dailyInserts, {
        updateOnDuplicate,
    });

    await HOURLY_RWA_DATA.bulkCreate(insertsWithTimestamp, {
        updateOnDuplicate,
    });

    await BACKUP_RWA_DATA.bulkCreate(insertsWithTimestamp, {
        updateOnDuplicate,
    });

    await HOURLY_RWA_DATA.destroy({
        where: {
            timestamp: { [Op.lte]: twoDaysAgo }
        }
    });
}
// Store metadata records
export async function storeMetadataPG(inserts: any): Promise<void> {
    const now = new Date();
    const insertsWithTimestamp = inserts.map((i: any) => ({
        ...i,
        created_at: i.created_at ?? now,
        updated_at: now,
    }));
    await META_RWA_DATA.bulkCreate(insertsWithTimestamp, { updateOnDuplicate: ['data', 'updated_at'] });
}
// Get historical and current data for a given id
export async function fetchHistoricalPG(id: string): Promise<{ historical: any[], current: any }> {
    const historical = await DAILY_RWA_DATA.findAll({
        attributes: ['timestamp', 'aggregatedefiactivetvl', 'aggregatemcap', 'aggregatedactivemcap'],
        where: { id },
        order: [['timestamp', 'ASC']],
        raw: true,
    });

    const current = await HOURLY_RWA_DATA.findOne({
        attributes: ['timestamp', 'aggregatedefiactivetvl', 'aggregatemcap', 'aggregatedactivemcap'],
        where: { id },
        order: [['timestamp', 'DESC']],
        raw: true,
    });

    return { historical, current };
}
// Get all metadata records
export async function fetchMetadataPG(): Promise<any[]> {
    await initPG();
    const data = await META_RWA_DATA.findAll({
        attributes: ['id', 'data'],
        order: [['id', 'ASC']],
        raw: true,
    });
    data.forEach((d: any) => {
        try {
            d.data = JSON.parse(d.data)
        } catch (e) {
            console.error(`Error parsing metadata for id ${d.id}:`, (e as any)?.message);
            delete d.data;
        }
    })
    return data.filter((d: any) => d.data)
}

// Get one record per id with the largest timestamp
export async function fetchCurrentPG(): Promise<{ id: string; timestamp: number; defiactivetvl: object; mcap: object; activemcap: object }[]> {
    const data = await HOURLY_RWA_DATA.sequelize!.query(
        `SELECT DISTINCT ON (id) id, timestamp, defiactivetvl, mcap, activemcap
         FROM "${HOURLY_RWA_DATA.getTableName()}"
         ORDER BY id, timestamp DESC`,
        { type: QueryTypes.SELECT }
    ) as { id: string; timestamp: number; defiactivetvl: string; mcap: string; activemcap: string }[];
    const jsonFields = ['defiactivetvl', 'mcap', 'activemcap']

    return data.map((d: any) => {
        const copy: any = { ...d }
        jsonFields.forEach((field) => {
            try {
                copy[field] = JSON.parse(d[field]);
            } catch (e) {
                console.error(`Error parsing field ${field} for id ${d.id}:`, (e as any)?.message);
                copy[field] = {};
            }
        })
        return copy
    }) as any
}
// Fetch all daily records, optionally filtered by updated_at timestamp
export async function fetchAllDailyRecordsPG(updatedAfter?: Date): Promise<any[]> {
    const whereClause = updatedAfter
        ? { updated_at: { [Op.gt]: updatedAfter } }
        : {};

    return await DAILY_RWA_DATA.findAll({
        attributes: ['id', 'timestamp', 'aggregatedefiactivetvl', 'aggregatemcap', 'aggregatedactivemcap', 'updated_at'],
        where: whereClause,
        order: [['id', 'ASC'], ['timestamp', 'ASC']],
        raw: true,
    });
}
// Get the list of unique IDs from daily records
export async function fetchAllDailyIdsPG(): Promise<string[]> {
    const results = await DAILY_RWA_DATA.sequelize!.query(
        `SELECT DISTINCT id FROM "${DAILY_RWA_DATA.getTableName()}" ORDER BY id`,
        { type: QueryTypes.SELECT }
    ) as { id: string }[];
    return results.map((r) => r.id);
}
// Get the max updated_at timestamp from daily records
export async function fetchMaxUpdatedAtPG(): Promise<Date | null> {
    const result = await DAILY_RWA_DATA.sequelize!.query(
        `SELECT MAX(updated_at) as max_updated_at FROM "${DAILY_RWA_DATA.getTableName()}"`,
        { type: QueryTypes.SELECT }
    ) as { max_updated_at: Date | null }[];
    return result[0]?.max_updated_at || null;
}
// Fetch daily records for a single ID
export async function fetchDailyRecordsForIdPG(id: string): Promise<any[]> {
    return await DAILY_RWA_DATA.findAll({
        attributes: ['timestamp', 'aggregatedefiactivetvl', 'aggregatemcap', 'aggregatedactivemcap'],
        where: { id },
        order: [['timestamp', 'ASC']],
        raw: true,
    });
}
const PAGE_SIZE = 5000;

function parseJsonSafe(str: string): any {
    try {
        return JSON.parse(str);
    } catch {
        return {};
    }
}

function parseChainFields(record: any): any {
    return {
        ...record,
        mcap: parseJsonSafe(record.mcap),
        activemcap: parseJsonSafe(record.activemcap),
        defiactivetvl: parseJsonSafe(record.defiactivetvl),
    };
}

// Fetch daily records with chain-level data, filtered by updated_at (for incremental sync)
export async function fetchDailyRecordsWithChainsPG(updatedAfter: Date): Promise<any[]> {
    const results: any[] = [];
    let offset = 0;

    while (true) {
        const batch = await DAILY_RWA_DATA.findAll({
            attributes: ['id', 'timestamp', 'mcap', 'activemcap', 'defiactivetvl', 'updated_at'],
            where: { updated_at: { [Op.gt]: updatedAfter } },
            order: [['id', 'ASC'], ['timestamp', 'ASC']],
            limit: PAGE_SIZE,
            offset,
            raw: true,
        });

        if (batch.length === 0) break;
        results.push(...batch.map(parseChainFields));
        if (batch.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
    }

    return results;
}

// Fetch daily records with chain-level data for a single ID (for full sync)
export async function fetchDailyRecordsWithChainsForIdPG(id: string): Promise<any[]> {
    const results: any[] = [];
    let offset = 0;

    while (true) {
        const batch = await DAILY_RWA_DATA.findAll({
            attributes: ['timestamp', 'mcap', 'activemcap', 'defiactivetvl'],
            where: { id },
            order: [['timestamp', 'ASC']],
            limit: PAGE_SIZE,
            offset,
            raw: true,
        });

        if (batch.length === 0) break;
        results.push(...batch.map(parseChainFields));
        if (batch.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
    }

    return results;
}

// Fetch unique timestamps
export async function fetchTimestampsPG(): Promise<number[]> {
    const results = await DAILY_RWA_DATA.sequelize!.query(
        `SELECT DISTINCT timestamp FROM "${DAILY_RWA_DATA.getTableName()}" ORDER BY timestamp ASC`,
        { type: QueryTypes.SELECT }
    ) as { timestamp: number }[];
    return results.map((r) => r.timestamp);
}

// Delete all entries with a given timestamp from DAILY_RWA_DATA and HOURLY_RWA_DATA
export async function deleteTimestampsPG(timestamp: number): Promise<void> {
    await DAILY_RWA_DATA.destroy({
        where: {
            timestamp
        }
    });

    await HOURLY_RWA_DATA.destroy({
        where: {
            timestamp
        }
    });
}

// Fetch sum of aggregate values from the latest hourly record per ID (for circuit breaker comparison)
export async function fetchLatestAggregateTotals(): Promise<{ defiActiveTvl: number; onChainMcap: number; activeMcap: number } | null> {
    try {
        const result = await HOURLY_RWA_DATA.sequelize!.query(
            `SELECT
                SUM(aggregatedefiactivetvl) as total_defiactivetvl,
                SUM(aggregatemcap) as total_mcap,
                SUM(aggregatedactivemcap) as total_activemcap
            FROM (
                SELECT DISTINCT ON (id) aggregatedefiactivetvl, aggregatemcap, aggregatedactivemcap
                FROM "${HOURLY_RWA_DATA.getTableName()}"
                ORDER BY id, timestamp DESC
            ) latest`,
            { type: QueryTypes.SELECT }
        ) as any[];

        if (!result.length || result[0].total_mcap == null) return null;

        return {
            defiActiveTvl: Number(result[0].total_defiactivetvl) || 0,
            onChainMcap: Number(result[0].total_mcap) || 0,
            activeMcap: Number(result[0].total_activemcap) || 0,
        };
    } catch (e) {
        console.error(`Failed to fetch latest aggregate totals: ${e}`);
        return null;
    }
}

// Close the database connection
async function closeConnection(): Promise<void> {
    if (!pgConnection) return;
    try {
        const closing = pgConnection.close()
        pgConnection = null
        await closing
        console.log('Database connection closed.');
    } catch (error) {
        console.error('Error while closing the database connection:', error);
    }
}
// Add a process exit hook to close the database connection
process.on('beforeExit', closeConnection); // // ts-node defi/src/rwa/historical.ts
process.on('exit', closeConnection);