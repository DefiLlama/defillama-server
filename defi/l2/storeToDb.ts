import postgres from "postgres";
import { queryPostgresWithRetry } from "../l2/layer2pg";
import { ChainTokens, ChartData, FinalChainData, FinalData } from "./types";
import { getCurrentUnixTimestamp } from "../src/utils/date";
import { getR2JSONString, storeR2JSONString } from "../src/utils/r2";

let auth: string[] = [];
const secondsInADay = 86400;
async function iniDbConnection() {
  auth = process.env.COINS2_AUTH?.split(",") ?? [];
  if (!auth || auth.length != 3) throw new Error("there arent 3 auth params");

  return postgres(auth[0], { idle_timeout: 90 });
}
export default async function storeHistoricalToDB(res: any) {
  const sql = await iniDbConnection();

  const read = await queryPostgresWithRetry(
    sql`
        select * from chainassets
        limit 1
        `,
    sql
  );
  const columns = read.columns.map((c: any) => c.name);

  try {
    const promises: Promise<void>[] = [];
    Object.keys(res).map(async (k: string) => {
      if (!columns.includes(k)) {
        promises.push(
          queryPostgresWithRetry(
            sql`
                alter table chainassets
                add ${sql(k)} text
                `,
            sql
          )
        );
        columns.push(k);
      }
    });
    await Promise.all(promises);
  } catch {}

  const insert: { [key: string]: string } = {};
  columns.map((k: string) => {
    insert[k] = k in res ? JSON.stringify(res[k]) : "{}";
  });

  await queryPostgresWithRetry(
    sql`
        insert into chainassets
        ${sql([insert], ...columns)}
        `,
    sql
  );

  sql.end();
}
export async function overwrite(res: { [key: string]: string }) {
  const sql = await iniDbConnection();
  const columns = Object.keys(res);
  const insert: { [key: string]: string } = {};
  columns.map((k: string) => {
    insert[k] = k in res ? JSON.stringify(res[k]) : "{}";
  });
  try {
    await queryPostgresWithRetry(
      sql`
        update chainassets
        set ${sql(insert, ...columns)}
        where timestamp = ${insert.timestamp}
        `,
      sql
    );
  } catch (e) {
    e;
  }
  sql.end();
}
export async function storeHistoricalFlows(rawData: ChainTokens, timestamp: number) {
  const sql = await iniDbConnection();

  const read = await queryPostgresWithRetry(
    sql`
        select * from chainassetflows
        limit 1
        `,
    sql
  );
  const columns = read.columns.map((c: any) => c.name);

  try {
    const promises: Promise<void>[] = [];
    Object.keys(rawData).map(async (k: string) => {
      if (!columns.includes(k)) {
        promises.push(
          queryPostgresWithRetry(
            sql`
                alter table chainassetflows
                add ${sql(k)} text
                `,
            sql
          )
        );
        columns.push(k);
      }
    });
    await Promise.all(promises);
  } catch {}

  const insert: { [key: string]: string } = { timestamp: timestamp.toFixed() };
  columns.map((k: string) => {
    if (k == "timestamp") return;
    insert[k] = k in rawData ? JSON.stringify(rawData[k]) : "{}";
  });

  await queryPostgresWithRetry(
    sql`
        insert into chainassetflows
        ${sql([insert], ...columns)}
        `,
    sql
  );

  sql.end();
}

function removeTokenBreakdown(data: FinalChainData): FinalChainData {
  const overviewData: any = {};
  Object.entries(data).map(([key, value]) => {
    overviewData[key] = Number(value.total).toFixed();
  });

  return overviewData;
}
export function parsePgData(timeseries: any[], chain: string, removeBreakdown: boolean = true) {
  const result: ChartData[] = [];
  timeseries.map((t: any) => {
    if (chain != "*") {
      const rawData = JSON.parse(t[chain]);
      if (!rawData) return;
      const data = removeBreakdown ? removeTokenBreakdown(rawData) : rawData;
      result.push({ timestamp: t.timestamp, data });
      return;
    }

    const data: FinalData = {};

    Object.keys(t).map((c: string) => {
      if (c == "timestamp") return;
      const rawData = JSON.parse(t[c]);
      if (!rawData) return;
      // DEBUG:
      // data[c] = rawData
      data[c] = removeBreakdown ? removeTokenBreakdown(rawData) : rawData;
    });

    result.push({ timestamp: t.timestamp, data });
  });

  result.sort((a: ChartData, b: ChartData) => Number(a.timestamp) - Number(b.timestamp));
  return result;
}
export async function fetchHistoricalFromDB(chain: string = "*") {
  const sql = await iniDbConnection();

  let latestOldTimestamp: string = "0";
  let oldTimeseries: any[] = [];

  // try {
  //   const oldTimestampsObj = await getR2JSONString(`chain-assets-chart-timestamps-${chain}`);
  //   const oldTimestamps: string[] = oldTimestampsObj.timestamps;
  //   if (oldTimestamps.length) {
  //     latestOldTimestamp = oldTimestamps[oldTimestamps.length - 1];
  //     oldTimeseries = await queryPostgresWithRetry(
  //       chain == "*"
  //         ? sql`select * from chainassets where timestamp in ${sql(oldTimestamps)}`
  //         : sql`select ${sql(chain)}, timestamp from chainassets where timestamp in ${sql(oldTimestamps)}`,
  //       sql
  //     );
  //   }
  // } catch {}

  const newTimeseries = await queryPostgresWithRetry(
    chain == "*"
      ? sql`select * from chainassets where timestamp > ${latestOldTimestamp}`
      : sql`select ${sql(chain)}, timestamp from chainassets where timestamp > ${latestOldTimestamp}`,
    sql
  );
  sql.end();

  const timeseries = [...oldTimeseries, ...newTimeseries];
  const result = parsePgData(timeseries, chain);

  const { data, timestamps } = findDailyEntries(result);

  await storeR2JSONString(`chain-assets-chart-timestamps-${chain}`, JSON.stringify({ timestamps }));

  return data;
}
function findDailyEntries(
  raw: ChartData[],
  period: number = secondsInADay
): { data: ChartData[]; timestamps: string[] } {
  const nullsFiltered = raw.filter((d: ChartData) => JSON.stringify(d.data) != "{}");
  const clean: ChartData[] = [];
  const timestamps = nullsFiltered.map((r: ChartData) => Number(r.timestamp));

  let timestamp = Math.floor(timestamps[0] / period) * period;
  const cleanEnd = Math.floor(timestamps[timestamps.length - 1] / period) * period;

  const filtered: string[] = [];
  while (timestamp < cleanEnd) {
    const index = timestamps.indexOf(
      timestamps.reduce((p, c) => (Math.abs(c - timestamp) < Math.abs(p - timestamp) ? c : p))
    );
    clean.push({ data: nullsFiltered[index].data, timestamp: timestamp.toString() });
    filtered.push(nullsFiltered[index].timestamp);
    timestamp += period;
  }
  if (nullsFiltered.length) clean.push(nullsFiltered[nullsFiltered.length - 1]);

  return { data: clean, timestamps: filtered };
}
export async function fetchFlows(period: number) {
  const sql = await iniDbConnection();

  const nowTimestamp = getCurrentUnixTimestamp();
  const startTimestamp = nowTimestamp - period;
  const timestampWithMargin = startTimestamp - period;

  const timeseries = await queryPostgresWithRetry(
    sql`
      select * from chainassets
      where timestamp > ${timestampWithMargin}
      `,
    sql
  );
  sql.end();

  const result = parsePgData(timeseries, "*");

  if (!result.length) throw new Error(`No data found`);
  const start: any = result.reduce(function (prev, curr) {
    return Math.abs(Number(curr.timestamp) - startTimestamp) < Math.abs(Number(prev.timestamp) - startTimestamp)
      ? curr
      : prev;
  });
  const end: any = result[result.length - 1];

  const res: any = {};
  const chains = Object.keys(end.data);

  chains.map((chain: string) => {
    res[chain] = {};
    Object.keys(end.data[chain]).map((k: string) => {
      if (!start.data[chain] || !(k in start.data[chain])) {
        res[chain][k] = { perc: "0", raw: "0" };
        return;
      }
      const a = start.data[chain][k];
      const b = end.data[chain][k];
      const raw = (b - a).toFixed();
      if (a != "0" && b == "0") res[chain][k] = { perc: "-100", raw };
      else if (b == "0") res[chain][k] = { perc: "0", raw };
      else if (a == "0") res[chain][k] = { perc: "100", raw };
      else res[chain][k] = { perc: ((100 * (b - a)) / a).toFixed(2), raw };
    });
  });

  return res;
}
export async function fetchHistoricalFlows(period: number, chain: string) {
  const sql = await iniDbConnection();
  const timeseries = await queryPostgresWithRetry(sql`select ${sql(chain)}, timestamp from chainassetflows`, sql);
  sql.end();
  const result = parsePgData(timeseries, chain, false);
  return findDailyEntries(result, period);
}
