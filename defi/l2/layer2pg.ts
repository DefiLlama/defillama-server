import postgres from "postgres";
import { Chain } from "@defillama/sdk/build/general";
import { TokenInsert } from "./types";
import setEnvSecrets from "../src/utils/shared/setEnvSecrets";
import sleep from "../src/utils/shared/sleep";
import { mixedCaseChains } from "./constants";

let auth: string[];
let sql: any;

export async function queryPostgresWithRetry(query: any, sql: any, counter: number = 0): Promise<any> {
  try {
    // console.log("created a new pg instance");
    const res = await sql`
        ${query}
        `;
    sql.end();
    return res;
  } catch (e) {
    if (counter > 5) throw e;
    await sleep(5000 + 2e4 * Math.random());
    sql = postgres(auth[0]);
    return await queryPostgresWithRetry(query, sql, counter + 1);
  }
}

async function generateAuth() {
  if (!process.env.COINS2_AUTH) await setEnvSecrets();
  auth = process.env.COINS2_AUTH?.split(",") ?? [];
  if (!auth || auth.length != 3) throw new Error("there arent 3 auth params");
}

export async function storeAllTokens(tokens: string[]) {
  if (!tokens.length) return;

  const inserts: TokenInsert[] = [];
  tokens.map((t: string) => {
    let [chain, token1] = t.split(":");
    if (!token1 && chain.startsWith("0x")) {
      token1 = chain;
      chain = "ethereum";
    } else if (!token1) {
      return;
    }
    const token = mixedCaseChains.includes(chain) ? token1 : token1.toLowerCase();
    if (!token) return;
    inserts.push({ chain, token });
  });

  if (!inserts.length) return;
  await generateAuth();
  if (!sql) sql = postgres(auth[0]);
  await queryPostgresWithRetry(
    sql`
    insert into alltokens
    ${sql(inserts, "chain", "token")}
    on conflict (chain, token)
    do nothing
  `,
    sql
  );
}

export async function storeNotTokens(tokens: string[]) {
  if (!tokens.length) return;

  const inserts: TokenInsert[] = [];
  tokens.map((t: string) => {
    let [chain, token1] = t.split(":");
    if (!token1 && chain.startsWith("0x")) {
      token1 = chain;
      chain = "ethereum";
    } else if (!token1) {
      return;
    }
    const token = mixedCaseChains.includes(chain) ? token1 : token1.toLowerCase();
    inserts.push({ chain, token });
  });

  if (!inserts.length) return;
  await generateAuth();
  if (!sql) sql = postgres(auth[0]);
  await queryPostgresWithRetry(
    sql`
    insert into nottokens
    ${sql(inserts, "chain", "token")}
    on conflict (chain, token)
    do nothing
  `,
    sql
  );
}

export async function fetchAllTokens(chain: Chain): Promise<string[]> {
  await generateAuth();
  if (!sql) sql = postgres(auth[0]);
  const res = await queryPostgresWithRetry(
    sql`
      select token from alltokens
      where chain = ${chain}
    `,
    sql
  );

  return res.map((r: any) => r.token);
}

export async function fetchNotTokens(chain: Chain): Promise<string[]> {
  await generateAuth();
  if (!sql) sql = postgres(auth[0]);
  const res = await queryPostgresWithRetry(
    sql`
      select token from nottokens
      where chain = ${chain}
    `,
    sql
  );

  return res.map((r: any) => r.token);
}
