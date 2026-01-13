import postgres from "postgres";
import { queryPostgresWithRetry } from "../../src/utils/shared/bridgedTvlPostgres";
import { getCurrentUnixTimestamp, getTimestampAtStartOfDay, secondsInDay } from "../../src/utils/date";
import { findDailyTimestamps } from "../../l2/v2/storeToDb";
import { getChainIdFromDisplayName } from "../utils/normalizeChain";
import protocols from "../protocols/data";
import entities from "../protocols/entities";
import treasuries from "../protocols/treasury";
import { cache } from "@defillama/sdk";

let auth: string[] = [];
const columns: any = ["timestamp", "id", "defiactivetvl", "mcap", "aggregatedefiactivetvl", "aggregatemcap"];
const twoDaysAgo = getTimestampAtStartOfDay(getCurrentUnixTimestamp() - 2 * secondsInDay);

export const protocolIdMap: { [id: string]: string } = {};
export const categoryMap: { [category: string]: string } = {};
[...protocols, ...entities, ...treasuries].map((protocol: any) => {
  protocolIdMap[protocol.id] = protocol.name;
  categoryMap[protocol.id] = protocol.category;
});

const inverseProtocolIdMap: { [name: string]: string } = Object.entries(protocolIdMap).reduce(
  (acc: { [name: string]: string }, [id, name]: [string, string]) => {
    acc[name] = id;
    return acc;
  },
  {}
);

async function iniDbConnection() {
  auth = process.env.COINS2_AUTH?.split(",") ?? [];
  if (!auth || auth.length != 3) throw new Error("there aren't 3 auth params");

  return postgres(auth[0], { idle_timeout: 90 });
}

export async function storeHistorical(res: any) {
  const { data, timestamp } = res;
  if (Object.keys(data).length == 0) return;

  const inserts: {
    timestamp: number;
    id: string;
    defiactivetvl: string;
    mcap: string;
    aggregatedefiactivetvl: number;
    aggregatemcap: number;
  }[] = [];
  Object.keys(data).forEach((id: any) => {
    const { defiActiveTvl, onChainMarketcap } = data[id];

    // use chain slugs for defi active tvls and aggregate 
    const defiactivetvl: { [chain: string]: { [id: string]: string } } = {};
    let aggregatedefiactivetvl: number = 0;
    Object.keys(defiActiveTvl ?? {}).map((chain: string) => {
      const chainSlug = getChainIdFromDisplayName(chain);
      defiactivetvl[chainSlug] = {};
      Object.keys(defiActiveTvl[chain]).map((name: string) => {
        const id = inverseProtocolIdMap[name];
        aggregatedefiactivetvl += Number(defiActiveTvl[chain][name]);
        defiactivetvl[chainSlug][id] = defiActiveTvl[chain][name];
      });
    });

    // use chain slugs for mcaps and aggregate 
    const mcap: { [chain: string]: string } = {};
    let aggregatemcap: number = 0;
    Object.keys(onChainMarketcap ?? {}).map((chain: string) => {
      const chainSlug = getChainIdFromDisplayName(chain);
      mcap[chainSlug] = onChainMarketcap[chain];
      aggregatemcap += Number(onChainMarketcap[chain]);
    });

    inserts.push({
      timestamp,
      id,
      defiactivetvl: JSON.stringify(defiactivetvl),
      mcap: JSON.stringify(mcap),
      aggregatedefiactivetvl,
      aggregatemcap,
    });
  });

  const sql = await iniDbConnection();
  await queryPostgresWithRetry(
    sql`
            insert into activetvls
            ${sql(inserts, ...columns)}
            on conflict (timestamp, id) 
            do nothing
            `,
    sql
  );

  // find and delete old hourly data 
  const timestamps = await queryPostgresWithRetry(
    sql`
            select distinct timestamp from activetvls where timestamp < ${twoDaysAgo}`,
    sql
  );

  if (!timestamps.length) {
    sql.end();
    return;
  }

  const dailyTimestamps = findDailyTimestamps(timestamps);

  const timestampsToDelete = timestamps.map((t: any) => t.timestamp).filter((t: number) => !dailyTimestamps.includes(t));
  if (!timestampsToDelete.length) {
    sql.end();
    return;
  }

  await queryPostgresWithRetry(
    sql`
            delete from activetvls where timestamp in ${sql(timestampsToDelete)}`,
    sql
  );

  sql.end();
}

async function fetchHistorical(id: string) {
  const cachedData = await cache.readCache(`rwa/historical-${id}`);
  const timestamp = getCurrentUnixTimestamp();
  if (cachedData.timestamp > timestamp - 3600) return cachedData.data;

  const sql = await iniDbConnection();
  const data = await queryPostgresWithRetry(
    sql`
            select timestamp, aggregatedefiactivetvl, aggregatemcap from activetvls where id = ${id}`,
    sql
  );
  sql.end();

  const res: { timestamp: number; onChainMarketcap: number; defiActiveTvl: number }[] = [];
  data.sort((a: any, b: any) => a.timestamp - b.timestamp);
  data.forEach((d: any) => {
    const timestamp = d.timestamp < twoDaysAgo ? getTimestampAtStartOfDay(d.timestamp) : d.timestamp;

    res.push({
      timestamp,
      onChainMarketcap: d.aggregatemcap,
      defiActiveTvl: d.aggregatedefiactivetvl,
    });
  });

  await cache.writeCache(`rwa/historical-${id}`, { data: res, timestamp: getCurrentUnixTimestamp() });

  return data;
}

export async function rwaChart(name: string) {
  const idMap = await cache.readCache("rwa/id-map");
  const id = idMap[name];
  if (!id) throw new Error(`Protocol ${name} not found`);
  const data = await fetchHistorical(id);
  return { data };
}
