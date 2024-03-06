import postgres from "postgres";
import { queryPostgresWithRetry } from "../l2/layer2pg";

export default async function storeHistoricalToDB(res: any) {
  const auth = process.env.COINS2_AUTH?.split(",") ?? [];
  if (!auth || auth.length != 3) throw new Error("there arent 3 auth params");

  const sql = postgres(auth[0], { idle_timeout: 90 });

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
  process.exit();
}
