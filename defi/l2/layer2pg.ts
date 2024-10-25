import { Chain } from "@defillama/sdk/build/general";
import { TokenInsert } from "./types";
import sleep from "../src/utils/shared/sleep";
import { mixedCaseChains } from "./constants";
import { getCoins2Connection } from "../src/getDBConnection";
import { sliceIntoChunks } from "@defillama/sdk/build/util";

const maxParams = 10000;
export async function queryPostgresWithRetry(query: any, sql: any, counter: number = 0): Promise<any> {
  try {
    const res = await sql`
        ${query}
        `;
    return res;
  } catch (e) {
    if (counter > 2) throw e;
    await sleep(1000 + 1e4 * Math.random());
    return await queryPostgresWithRetry(query, sql, counter + 1);
  }
}

function splitKey(inserts: TokenInsert[], key: string) {
  const index = key.indexOf(":");
  let [chain, token1] = [key.substring(0, index), key.substring(index + 1)];
  if (!chain && token1.startsWith("0x")) {
    chain = "ethereum";
  } else if (!chain) {
    return;
  }
  const token = mixedCaseChains.includes(chain) ? token1 : token1.toLowerCase();
  if (!token) return;
  inserts.push({ chain, token });
}

export async function storeAllTokens(tokens: string[]) {
  if (!tokens.length) return;

  const inserts: TokenInsert[] = [];
  tokens.map((t: string) => splitKey(inserts, t));

  if (!inserts.length) return;
  const sql = await getCoins2Connection();

  const chunks: any = sliceIntoChunks(inserts, maxParams);
  for (const chunk of chunks) {
    await queryPostgresWithRetry(
      sql`
      insert into alltokens
      ${sql(chunk, "chain", "token")}
      on conflict (chain, token)
      do nothing
    `,
      sql
    );
  }
}

export async function storeNotTokens(tokens: string[]) {
  if (!tokens.length) return;

  const inserts: TokenInsert[] = [];
  tokens.map((t: string) => splitKey(inserts, t));

  if (!inserts.length) return;
  const sql = await getCoins2Connection();

  const chunks: any = sliceIntoChunks(inserts, maxParams);
  for (const chunk of chunks) {
    await queryPostgresWithRetry(
      sql`
        insert into nottokens
        ${sql(chunk, "chain", "token")}
        on conflict (chain, token)
        do nothing
      `,
      sql
    );
  }
}

export async function fetchAllTokens(chain: Chain): Promise<string[]> {
  const sql = await getCoins2Connection();
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
  const sql = await getCoins2Connection();
  const res = await queryPostgresWithRetry(
    sql`
      select token from nottokens
      where chain = ${chain}
    `,
    sql
  );

  return res.map((r: any) => r.token);
}
