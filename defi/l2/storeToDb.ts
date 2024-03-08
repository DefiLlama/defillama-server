import postgres from "postgres";
import { queryPostgresWithRetry } from "../l2/layer2pg";
import { FinalChainData, FinalData } from "./types";
import setEnvSecrets from "../src/utils/shared/setEnvSecrets";

let auth: string[] = [];
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
export async function fetchHistoricalFromDB(chain: string = "*") {
  const sql = await iniDbConnection();

  const timeseries = await queryPostgresWithRetry(
    chain == "*" ? sql`select * from chainassets` : sql`select ${sql(chain)}, timestamp from chainassets`,
    sql
  );
  sql.end();

  const result: { timestamp: string; data: FinalChainData | FinalData }[] = [];
  timeseries.map((t: any) => {
    if (chain != "*") {
      result.push({ timestamp: t.timestamp, data: JSON.parse(t[chain]) });
      return;
    }

    const data: FinalData = {};

    Object.keys(t).map((c: string) => {
      if (c == "timestamp") return;
      data[c] = JSON.parse(t[c]);
    });

    result.push({ timestamp: t.timestamp, data });
  });

  return result;
}
