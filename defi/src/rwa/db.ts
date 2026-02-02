import { getCurrentUnixTimestamp, getTimestampAtStartOfDay, secondsInDay } from "../../src/utils/date";
import { DataTypes, Model, Op, QueryTypes, Sequelize } from 'sequelize'
import { normalizeRwaMetadataForApiInPlace } from "./utils";

class META_RWA_DATA extends Model { }
class DAILY_RWA_DATA extends Model { }
class HOURLY_RWA_DATA extends Model { }
class BACKUP_RWA_DATA extends Model { }

let pgConnection: any;

const twoDaysAgo = getTimestampAtStartOfDay(getCurrentUnixTimestamp() - 2 * secondsInDay);

// Initialize the database tables
async function _initPGTables() {
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
function _initializeRwaDB() {
    if (!pgConnection) {
        const auth = process.env.COINS2_AUTH?.split(",") ?? [];
        if (!auth || auth.length != 3) throw new Error("there aren't 3 auth params");

        pgConnection = new Sequelize(auth[0]);
        // _initPGTables()
    }
}

// Initialize the database connection
export async function initPG(): Promise<void> {
    if (pgConnection) return;
    _initializeRwaDB();
}
// Find records where timestamp equals the target timestamp, one per id
async function findDailyTimestampRecords(targetTimestamp: number): Promise<{ [id: string]: { timestamp: number; timestamp_actual: number } }> {
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
    // Add created_at (if missing) and updated_at to all inserts for hourly and backup tables
    const insertsWithTimestamp = inserts.map((i: any) => ({
        ...i,
        created_at: i.created_at ?? now,
        updated_at: now,
    }));

    const dayTimestamp = getTimestampAtStartOfDay(timestamp);
    // const closestRecord = await findDailyTimestampRecords(dayTimestamp);
    const now = new Date();

    const dailyInserts: any[] = [];
    insertsWithTimestamp.map((i: any) => {
        const { id, timestamp } = i;
        // const closestRecordData = closestRecord[id];
        const insert = {
            ...i,
            timestamp: dayTimestamp,
            timestamp_actual: timestamp,
        };
        dailyInserts.push(insert);

        // if (!closestRecordData) dailyInserts.push(insert);
        // else if (Math.abs(dayTimestamp - closestRecordData.timestamp_actual) > Math.abs(dayTimestamp - timestamp)) dailyInserts.push(insert);
    })


    const updateOnDuplicate = ['defiactivetvl', 'mcap', 'activemcap', 'aggregatedefiactivetvl', 'aggregatemcap', 'aggregatedactivemcap', 'timestamp_actual', 'updated_at'];

    // Bulk insert with conflict handling - skip duplicates (don't update existing records)
    await DAILY_RWA_DATA.bulkCreate(dailyInserts, { updateOnDuplicate });

    await HOURLY_RWA_DATA.bulkCreate(insertsWithTimestamp, { updateOnDuplicate, });

    await BACKUP_RWA_DATA.bulkCreate(insertsWithTimestamp, { updateOnDuplicate, });

    // Clean up old hourly data
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
            normalizeRwaMetadataForApiInPlace(d.data)
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

// Get the list of unique IDs from daily records
export async function fetchAllDailyIdsPG(): Promise<string[]> {
    const results = await DAILY_RWA_DATA.sequelize!.query(
        `SELECT DISTINCT id FROM "${DAILY_RWA_DATA.getTableName()}" ORDER BY id`,
        { type: QueryTypes.SELECT }
    ) as { id: string }[];
    return results.map((r) => r.id);
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