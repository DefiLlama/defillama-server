import { getCurrentUnixTimestamp, getTimestampAtStartOfDay, secondsInDay } from "../../utils/date";
import { DataTypes, Model, Op, QueryTypes, Sequelize } from 'sequelize'

class META_RWA_PERPS_DATA extends Model { }
export class DAILY_RWA_PERPS_DATA extends Model { }
export class HOURLY_RWA_PERPS_DATA extends Model { }
class BACKUP_RWA_PERPS_DATA extends Model { }
export class FUNDING_HISTORY extends Model { }

let pgConnection: any;

const twoDaysAgo = getTimestampAtStartOfDay(getCurrentUnixTimestamp() - 2 * secondsInDay);

async function initPGTables() {
    HOURLY_RWA_PERPS_DATA.init({
        timestamp: { type: DataTypes.INTEGER, primaryKey: true },
        id: { type: DataTypes.STRING, primaryKey: true },
        open_interest: { type: DataTypes.DECIMAL },
        volume_24h: { type: DataTypes.DECIMAL },
        price: { type: DataTypes.DECIMAL },
        price_change_24h: { type: DataTypes.DECIMAL },
        funding_rate: { type: DataTypes.DECIMAL },
        premium: { type: DataTypes.DECIMAL },
        cumulative_funding: { type: DataTypes.DECIMAL },
        data: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    }, {
        sequelize: pgConnection,
        timestamps: false,
        tableName: 'hourly_rwa_perps_data',
        indexes: [
            { name: 'hourly_rwa_perps_id_index', fields: ['id'] },
            { name: 'hourly_rwa_perps_timestamp_index', fields: ['timestamp'] },
            { name: 'hourly_rwa_perps_updated_at_index', fields: ['updated_at'] },
        ]
    });

    DAILY_RWA_PERPS_DATA.init({
        timestamp: { type: DataTypes.INTEGER, primaryKey: true },
        id: { type: DataTypes.STRING, primaryKey: true },
        timestamp_actual: { type: DataTypes.INTEGER },
        open_interest: { type: DataTypes.DECIMAL },
        volume_24h: { type: DataTypes.DECIMAL },
        price: { type: DataTypes.DECIMAL },
        price_change_24h: { type: DataTypes.DECIMAL },
        funding_rate: { type: DataTypes.DECIMAL },
        premium: { type: DataTypes.DECIMAL },
        cumulative_funding: { type: DataTypes.DECIMAL },
        data: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    }, {
        sequelize: pgConnection,
        timestamps: false,
        tableName: 'daily_rwa_perps_data',
        indexes: [
            { name: 'daily_rwa_perps_id_index', fields: ['id'] },
            { name: 'daily_rwa_perps_timestamp_index', fields: ['timestamp'] },
            { name: 'daily_rwa_perps_updated_at_index', fields: ['updated_at'] },
        ]
    });

    BACKUP_RWA_PERPS_DATA.init({
        timestamp: { type: DataTypes.INTEGER, primaryKey: true },
        id: { type: DataTypes.STRING, primaryKey: true },
        open_interest: { type: DataTypes.DECIMAL },
        volume_24h: { type: DataTypes.DECIMAL },
        price: { type: DataTypes.DECIMAL },
        price_change_24h: { type: DataTypes.DECIMAL },
        funding_rate: { type: DataTypes.DECIMAL },
        premium: { type: DataTypes.DECIMAL },
        cumulative_funding: { type: DataTypes.DECIMAL },
        data: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    }, {
        sequelize: pgConnection,
        timestamps: false,
        tableName: 'backup_rwa_perps_data',
        indexes: [
            { name: 'backup_rwa_perps_id_index', fields: ['id'] },
            { name: 'backup_rwa_perps_timestamp_index', fields: ['timestamp'] },
            { name: 'backup_rwa_perps_updated_at_index', fields: ['updated_at'] },
        ]
    });

    META_RWA_PERPS_DATA.init({
        id: { type: DataTypes.STRING, primaryKey: true },
        data: { type: DataTypes.JSON },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    }, {
        sequelize: pgConnection,
        timestamps: false,
        tableName: 'meta_rwa_perps_data',
        indexes: [
            { name: 'meta_rwa_perps_id_index', fields: ['id'] },
            { name: 'meta_rwa_perps_updated_at_index', fields: ['updated_at'] },
        ]
    });

    FUNDING_HISTORY.init({
        timestamp: { type: DataTypes.INTEGER, primaryKey: true },
        id: { type: DataTypes.STRING, primaryKey: true },
        coin: { type: DataTypes.STRING },
        venue: { type: DataTypes.STRING },
        funding_rate: { type: DataTypes.DECIMAL },
        premium: { type: DataTypes.DECIMAL },
        open_interest: { type: DataTypes.DECIMAL },
        funding_payment: { type: DataTypes.DECIMAL },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    }, {
        sequelize: pgConnection,
        timestamps: false,
        tableName: 'rwa_perps_funding_history',
        indexes: [
            { name: 'funding_history_id_index', fields: ['id'] },
            { name: 'funding_history_coin_index', fields: ['coin'] },
            { name: 'funding_history_timestamp_index', fields: ['timestamp'] },
        ]
    });
}

async function initializePerpsDB(): Promise<void> {
    if (!pgConnection) {
        const auth = process.env.COINS2_AUTH?.split(",") ?? [];
        if (!auth || auth.length != 3) throw new Error("there aren't 3 auth params");

        pgConnection = new Sequelize(auth[0], {
            logging: false,
        });
        initPGTables()
    }
}

function getPGConnection(): Sequelize {
    return pgConnection
}

export async function initPG(): Promise<void> {
    if (pgConnection) return;
    await initializePerpsDB();
    pgConnection = getPGConnection();
}

// Find records where timestamp equals the target timestamp, one per id
export async function findDailyTimestampRecords(targetTimestamp: number): Promise<{ [id: string]: { timestamp: number; timestamp_actual: number } }> {
    const records = await DAILY_RWA_PERPS_DATA.sequelize!.query(
        `SELECT DISTINCT ON (id) id, timestamp, timestamp_actual
         FROM "${DAILY_RWA_PERPS_DATA.getTableName()}"
         WHERE timestamp = ${targetTimestamp}
         ORDER BY id, timestamp`,
        { type: QueryTypes.SELECT }
    ) as Array<{ id: string; timestamp: number; timestamp_actual: number }>;

    const result: { [id: string]: { timestamp: number; timestamp_actual: number } } = {};
    records.forEach((record) => {
        result[record.id] = {
            timestamp: record.timestamp,
            timestamp_actual: record.timestamp_actual
        };
    });
    return result;
}

// Store historical perps data
export async function storeHistoricalPG(inserts: any[], timestamp: number): Promise<void> {
    const dayTimestamp = getTimestampAtStartOfDay(timestamp);
    const closestRecord = await findDailyTimestampRecords(dayTimestamp);
    const now = new Date();

    const dailyInserts: any[] = [];
    inserts.map((i: any) => {
        const { id } = i;
        const closestRecordData = closestRecord[id];
        const insert = {
            ...i,
            timestamp: dayTimestamp,
            timestamp_actual: timestamp,
            created_at: i.created_at ?? now,
            updated_at: now,
        };

        if (!closestRecordData) dailyInserts.push(insert);
        else if (Math.abs(dayTimestamp - closestRecordData.timestamp_actual) > Math.abs(dayTimestamp - timestamp)) dailyInserts.push(insert);
    })

    const insertsWithTimestamp = inserts.map((i: any) => ({
        ...i,
        created_at: i.created_at ?? now,
        updated_at: now,
    }));

    const updateOnDuplicate = [
        'open_interest', 'volume_24h', 'price', 'price_change_24h',
        'funding_rate', 'premium', 'cumulative_funding', 'data',
        'timestamp_actual', 'updated_at'
    ];

    await DAILY_RWA_PERPS_DATA.bulkCreate(dailyInserts, { updateOnDuplicate });
    await HOURLY_RWA_PERPS_DATA.bulkCreate(insertsWithTimestamp, { updateOnDuplicate });
    await BACKUP_RWA_PERPS_DATA.bulkCreate(insertsWithTimestamp, { updateOnDuplicate });

    await HOURLY_RWA_PERPS_DATA.destroy({
        where: { timestamp: { [Op.lte]: twoDaysAgo } }
    });
}

// Store metadata records
export async function storeMetadataPG(inserts: any[]): Promise<void> {
    const now = new Date();
    const insertsWithTimestamp = inserts.map((i: any) => ({
        ...i,
        created_at: i.created_at ?? now,
        updated_at: now,
    }));
    await META_RWA_PERPS_DATA.bulkCreate(insertsWithTimestamp, { updateOnDuplicate: ['data', 'updated_at'] });
}

// Store funding history records
export async function storeFundingHistoryPG(inserts: any[]): Promise<void> {
    if (!inserts.length) return;
    const now = new Date();
    const insertsWithTimestamp = inserts.map((i: any) => ({
        ...i,
        created_at: i.created_at ?? now,
    }));
    await FUNDING_HISTORY.bulkCreate(insertsWithTimestamp, {
        updateOnDuplicate: ['funding_rate', 'premium', 'open_interest', 'funding_payment'],
    });
}

// Get cumulative funding for a coin from funding_history
export async function fetchCumulativeFundingPG(id: string): Promise<number> {
    const result = await FUNDING_HISTORY.sequelize!.query(
        `SELECT COALESCE(SUM(funding_payment), 0) as total
         FROM "rwa_perps_funding_history"
         WHERE id = :id`,
        { replacements: { id }, type: QueryTypes.SELECT }
    ) as { total: number }[];
    return Number(result[0]?.total) || 0;
}

// Get the latest funding history timestamp for a coin
export async function fetchLatestFundingTimestampPG(id: string): Promise<number | null> {
    const result = await FUNDING_HISTORY.sequelize!.query(
        `SELECT MAX(timestamp) as max_ts
         FROM "rwa_perps_funding_history"
         WHERE id = :id`,
        { replacements: { id }, type: QueryTypes.SELECT }
    ) as { max_ts: number | null }[];
    return result[0]?.max_ts ?? null;
}

// Get historical and current data for a given id
export async function fetchHistoricalPG(id: string): Promise<{ historical: any[], current: any }> {
    const historical = await DAILY_RWA_PERPS_DATA.findAll({
        attributes: ['timestamp', 'open_interest', 'volume_24h', 'price', 'price_change_24h', 'funding_rate', 'premium', 'cumulative_funding'],
        where: { id },
        order: [['timestamp', 'ASC']],
        raw: true,
    });

    const current = await HOURLY_RWA_PERPS_DATA.findOne({
        attributes: ['timestamp', 'open_interest', 'volume_24h', 'price', 'price_change_24h', 'funding_rate', 'premium', 'cumulative_funding'],
        where: { id },
        order: [['timestamp', 'DESC']],
        raw: true,
    });

    return { historical, current };
}

// Get all metadata records
export async function fetchMetadataPG(): Promise<any[]> {
    await initPG();
    const data = await META_RWA_PERPS_DATA.findAll({
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
export async function fetchCurrentPG(): Promise<any[]> {
    const data = await HOURLY_RWA_PERPS_DATA.sequelize!.query(
        `SELECT DISTINCT ON (id) id, timestamp, open_interest, volume_24h, price,
                price_change_24h, funding_rate, premium, cumulative_funding, data
         FROM "${HOURLY_RWA_PERPS_DATA.getTableName()}"
         ORDER BY id, timestamp DESC`,
        { type: QueryTypes.SELECT }
    ) as any[];

    return data.map((d: any) => {
        const copy: any = { ...d };
        try {
            copy.data = d.data ? JSON.parse(d.data) : {};
        } catch {
            copy.data = {};
        }
        return copy;
    });
}

// Fetch all daily records, optionally filtered by updated_at timestamp
export async function fetchAllDailyRecordsPG(updatedAfter?: Date): Promise<any[]> {
    const whereClause = updatedAfter
        ? { updated_at: { [Op.gt]: updatedAfter } }
        : {};

    return await DAILY_RWA_PERPS_DATA.findAll({
        attributes: ['id', 'timestamp', 'open_interest', 'volume_24h', 'price', 'price_change_24h', 'funding_rate', 'premium', 'cumulative_funding', 'updated_at'],
        where: whereClause,
        order: [['id', 'ASC'], ['timestamp', 'ASC']],
        raw: true,
    });
}

// Get the list of unique IDs from daily records
export async function fetchAllDailyIdsPG(): Promise<string[]> {
    const results = await DAILY_RWA_PERPS_DATA.sequelize!.query(
        `SELECT DISTINCT id FROM "${DAILY_RWA_PERPS_DATA.getTableName()}" ORDER BY id`,
        { type: QueryTypes.SELECT }
    ) as { id: string }[];
    return results.map((r) => r.id);
}

// Get the max updated_at timestamp from daily records
export async function fetchMaxUpdatedAtPG(): Promise<Date | null> {
    const result = await DAILY_RWA_PERPS_DATA.sequelize!.query(
        `SELECT MAX(updated_at) as max_updated_at FROM "${DAILY_RWA_PERPS_DATA.getTableName()}"`,
        { type: QueryTypes.SELECT }
    ) as { max_updated_at: Date | null }[];
    return result[0]?.max_updated_at || null;
}

// Fetch daily records for a single ID
export async function fetchDailyRecordsForIdPG(id: string): Promise<any[]> {
    return await DAILY_RWA_PERPS_DATA.findAll({
        attributes: ['timestamp', 'open_interest', 'volume_24h', 'price', 'price_change_24h', 'funding_rate', 'premium', 'cumulative_funding'],
        where: { id },
        order: [['timestamp', 'ASC']],
        raw: true,
    });
}

// Fetch sum of aggregate values from the latest hourly record per ID (for circuit breaker)
export async function fetchLatestAggregateTotals(): Promise<{ openInterest: number; volume24h: number } | null> {
    try {
        const result = await HOURLY_RWA_PERPS_DATA.sequelize!.query(
            `SELECT
                SUM(open_interest) as total_oi,
                SUM(volume_24h) as total_vol
            FROM (
                SELECT DISTINCT ON (id) open_interest, volume_24h
                FROM "${HOURLY_RWA_PERPS_DATA.getTableName()}"
                ORDER BY id, timestamp DESC
            ) latest`,
            { type: QueryTypes.SELECT }
        ) as any[];

        if (!result.length || result[0].total_oi == null) return null;

        return {
            openInterest: Number(result[0].total_oi) || 0,
            volume24h: Number(result[0].total_vol) || 0,
        };
    } catch (e) {
        console.error(`Failed to fetch latest aggregate totals: ${e}`);
        return null;
    }
}

// Fetch funding history for a specific coin within a time range
export async function fetchFundingHistoryPG(id: string, startTime?: number, endTime?: number): Promise<any[]> {
    const where: any = { id };
    if (startTime) where.timestamp = { ...(where.timestamp || {}), [Op.gte]: startTime };
    if (endTime) where.timestamp = { ...(where.timestamp || {}), [Op.lte]: endTime };

    return await FUNDING_HISTORY.findAll({
        where,
        order: [['timestamp', 'ASC']],
        raw: true,
    });
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

process.on('beforeExit', closeConnection);
process.on('exit', closeConnection);
