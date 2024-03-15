import postgres from "postgres";
import { queryPostgresWithRetry } from "../l2/layer2pg";
import { ChartData, FinalChainData, FinalData } from "./types";
import setEnvSecrets from "../src/utils/shared/setEnvSecrets";

let auth: string[] = [];
const secondsInADay = 86400;
async function iniDbConnection() {
  await setEnvSecrets();
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
        on conflict (timestamp)
        do nothing
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
export async function fetchHistoricalFromDB(chain: string = "*") {
  const sql = await iniDbConnection();

  const timeseries = await queryPostgresWithRetry(
    chain == "*" ? sql`select * from chainassets` : sql`select ${sql(chain)}, timestamp from chainassets`,
    sql
  );
  sql.end();

  const result: ChartData[] = [];
  timeseries.map((t: any) => {
    if (chain != "*") {
      const rawData = JSON.parse(t[chain]);
      const data = removeTokenBreakdown(rawData);
      if (Object.keys(data).length) result.push({ timestamp: t.timestamp, data });
      return;
    }

    const data: FinalData = {};

    Object.keys(t).map((c: string) => {
      if (c == "timestamp") return;
      const rawData = JSON.parse(t[c]);
      data[c] = removeTokenBreakdown(rawData);
    });

    result.push({ timestamp: t.timestamp, data });
  });

  result.sort((a: ChartData, b: ChartData) => Number(a.timestamp) - Number(b.timestamp));
  return findDailyEntries(result);
}
function findDailyEntries(raw: ChartData[]): ChartData[] {
  const clean: ChartData[] = [];
  const timestamps = raw.map((r: ChartData) => Number(r.timestamp));

  let timestamp = Math.floor(timestamps[0] / secondsInADay) * secondsInADay;
  const cleanEnd = Math.floor(timestamps[timestamps.length - 1] / secondsInADay) * secondsInADay;

  while (timestamp < cleanEnd) {
    const index = timestamps.indexOf(
      timestamps.reduce((p, c) => (Math.abs(c - timestamp) < Math.abs(p - timestamp) ? c : p))
    );
    clean.push({ data: raw[index].data, timestamp: timestamp.toString() });
    timestamp += secondsInADay;
  }

  clean.push(raw[raw.length - 1]);

  return clean;
}
