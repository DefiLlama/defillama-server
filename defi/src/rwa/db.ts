import { getCurrentUnixTimestamp, getTimestampAtStartOfDay, secondsInDay } from "../../src/utils/date";
import { DataTypes, Model, Op, QueryTypes, Sequelize } from 'sequelize'

class META_RWA_DATA extends Model { }
class DAILY_RWA_DATA extends Model { }
class HOURLY_RWA_DATA extends Model { }
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
    }, {
        sequelize: pgConnection,
        timestamps: false,
        tableName: 'hourly_rwa_data',
        indexes: [
            { name: 'activetvls_id_index', fields: ['id'], },
            { name: 'activetvls_timestamp_index', fields: ['timestamp'], },
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
    }, {
        sequelize: pgConnection,
        timestamps: false,
        tableName: 'daily_rwa_data',
        indexes: [
            { name: 'activetvls_id_index', fields: ['id'], },
            { name: 'activetvls_timestamp_index', fields: ['timestamp'], },
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
    }, {
        sequelize: pgConnection,
        timestamps: false,
        tableName: 'backup_rwa_data',
        indexes: [
            { name: 'activetvlsbackup_id_index', fields: ['id'], },
            { name: 'activetvlsbackup_timestamp_index', fields: ['timestamp'], },
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
    }, {
        sequelize: pgConnection,
        timestamps: false,
        tableName: 'meta_rwa_data',
        indexes: [
            { name: 'meta_rwa_id_index', fields: ['id'], },
        ]
    });
}
// Initialize the database connection
async function initializeRwaDB(): Promise<void> {
    if (!pgConnection) {
        const auth = process.env.COINS2_AUTH?.split(",") ?? [];
        if (!auth || auth.length != 3) throw new Error("there aren't 3 auth params");

        pgConnection = new Sequelize(auth[0]);
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

    const dailyInserts: any[] = [];
    inserts.map((i: any) => {
        const { id, timestamp } = i;
        const closestRecordData = closestRecord[id];
        const insert = { ...i, timestamp: dayTimestamp, timestamp_actual: timestamp };  

        if (!closestRecordData) dailyInserts.push(insert);
        else if (Math.abs(dayTimestamp - closestRecordData.timestamp_actual) > Math.abs(dayTimestamp - timestamp)) dailyInserts.push(insert);
    })

    const updateOnDuplicate = ['defiactivetvl', 'mcap', 'activemcap', 'aggregatedefiactivetvl', 'aggregatemcap', 'aggregatedactivemcap', 'timestamp_actual'];
    
    // Bulk insert with conflict handling - overwrite on duplicate
    await DAILY_RWA_DATA.bulkCreate(dailyInserts, {
        updateOnDuplicate,
    });

    await HOURLY_RWA_DATA.bulkCreate(inserts, {
        updateOnDuplicate,
    });

    await BACKUP_RWA_DATA.bulkCreate(inserts, {
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
    await META_RWA_DATA.bulkCreate(inserts, { updateOnDuplicate: ['data'] });
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
    return await META_RWA_DATA.findAll({
        attributes: ['id', 'data'],
        order: [['id', 'ASC']],
        raw: true,
    });
}
// Get one record per id with the largest timestamp
export async function fetchCurrentPG(): Promise<{ id: string; timestamp: number; defiactivetvl: string; mcap: string; activemcap: string }[]> {
    return await HOURLY_RWA_DATA.sequelize!.query(
        `SELECT DISTINCT ON (id) id, timestamp, defiactivetvl, mcap, activemcap 
         FROM "${HOURLY_RWA_DATA.getTableName()}" 
         ORDER BY id, timestamp DESC`,
        { type: QueryTypes.SELECT }
    ) as { id: string; timestamp: number; defiactivetvl: string; mcap: string; activemcap: string }[];
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