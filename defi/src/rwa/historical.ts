import postgres from "postgres";
import { queryPostgresWithRetry } from "../../src/utils/shared/bridgedTvlPostgres";
import { getCurrentUnixTimestamp, getTimestampAtStartOfDay, secondsInDay } from "../../src/utils/date";
import { findDailyTimestamps } from "../../l2/v2/storeToDb";
import { getChainIdFromDisplayName } from "../utils/normalizeChain";
import protocols from "../protocols/data";
import entities from "../protocols/entities";
import treasuries from "../protocols/treasury";
import { getR2JSONString } from "../utils/r2";

let auth: string[] = [];
const columns: any = ["timestamp", "id", "defiactivetvl", "mcap"];
const twoDaysAgo = getTimestampAtStartOfDay(getCurrentUnixTimestamp() - 2 * secondsInDay);

export const protocolIdMap: { [id: string]: string } = {};
[...protocols, ...entities, ...treasuries].map((protocol: any) => {
  protocolIdMap[protocol.id] = protocol.name;
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

  const inserts: { timestamp: number; id: string; defiactivetvl: string; mcap: string }[] = [];
  Object.keys(data).forEach((id: any) => {
    const { defiActiveTvl, onChainMarketcap } = data[id];

    const defiactivetvl: { [chain: string]: { [id: string]: string } } = {};
    Object.keys(defiActiveTvl).map((chain: string) => {
      const chainSlug = getChainIdFromDisplayName(chain);
      defiactivetvl[chainSlug] = {};
      Object.keys(defiActiveTvl[chain]).map((name: string) => {
        const id = inverseProtocolIdMap[name];
        defiactivetvl[chainSlug][id] = defiActiveTvl[chain][name];
      });
    });
    const mcap: { [chain: string]: string } = {};
    Object.keys(onChainMarketcap).map((chain: string) => {
      const chainSlug = getChainIdFromDisplayName(chain);
      mcap[chainSlug] = onChainMarketcap[chain];
    });

    inserts.push({
      timestamp,
      id,
      defiactivetvl: JSON.stringify(defiactivetvl),
      mcap: JSON.stringify(mcap),
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

  const timestamps = await queryPostgresWithRetry(
    sql`
            select timestamp from activetvls where timestamp < ${twoDaysAgo}`,
    sql
  );

  if (!timestamps.length) return;

  const dailyTimestamps = findDailyTimestamps(timestamps);

  const timestampsToDelete = timestamps.filter((t: any) => !dailyTimestamps.includes(t.timestamp));
  await queryPostgresWithRetry(
    sql`
            delete from activetvls where timestamp in ${sql(timestampsToDelete)}`,
    sql
  );

  sql.end();
}

async function fetchHistorical(id: string) {
  const sql = await iniDbConnection();
  const data = await queryPostgresWithRetry(
    sql`
            select * from activetvls where id = ${id}`,
    sql
  );
  sql.end();

  const res: { timestamp: number; onChainMarketcap: number; defiActiveTvl: number }[] = [];
  data.forEach((d: any) => {
    const timestamp = d.timestamp < twoDaysAgo ? getTimestampAtStartOfDay(d.timestamp) : d.timestamp;
    const mcapBreakdown = JSON.parse(d.mcap);
    const datvlBreakdown = JSON.parse(d.defiactivetvl);
    let onChainMarketcap = 0;
    Object.keys(mcapBreakdown).forEach((chain: string) => {
      onChainMarketcap += Number(mcapBreakdown[chain]);
    });
    let defiActiveTvl = 0;
    Object.keys(datvlBreakdown).forEach((chain: string) => {
      Object.keys(datvlBreakdown[chain]).forEach((protocol: string) => {
        defiActiveTvl += Number(datvlBreakdown[chain][protocol]);
      });
    });

    res.push({
      timestamp,
      onChainMarketcap,
      defiActiveTvl,
    });
  });

  return data;
}

export async function rwaChart(name: string) {
  const idMap = await getR2JSONString("rwa/id-map");
  const id = idMap[name]
  if (!id) throw new Error(`Protocol ${name} not found`);
  const data = await fetchHistorical(id);
  return { data };
}
