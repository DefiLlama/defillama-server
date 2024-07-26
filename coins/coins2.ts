import { CoinRead } from "./src/adapters/utils/dbInterfaces";
import getTVLOfRecordClosestToTimestamp from "./src/utils/shared/getRecordClosestToTimestamp";
import { getCurrentUnixTimestamp } from "./src/utils/date";
import { Redis } from "ioredis";
import { getCoins2Connection } from "./getDBConnection";
import { sendMessage } from "../defi/src/utils/discord";
import fetch from "node-fetch";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const changedAdapterColumns: any[] = ["key", "from", "to", "change"];
const pgColumns: string[] = [
  "key",
  "chain",
  "timestamp",
  "price",
  "confidence",
  "mcap",
];
const latency: number = 1 * 60 * 60; // 1hr
const margin: number = 6 * 60 * 60; // 12hr
const confidenceThreshold: number = 0.3;
const zeroDecimalAdapters: string[] = [
  'LiNEAR',
  "coingecko",
  "chainlink-nft",
  "defichain",
  "radixdlt",
  "reservoir",
  "ociswap",
  "aktionariat",
  "minswap",
  "optimBonds",
  "distressed",
];
export type Coin = {
  price: number;
  timestamp: number;
  key: string;
  chain: string;
  adapter: string;
  confidence: number;
  decimals?: number;
  symbol: string;
  mcap?: number | null;
};
type CoinDict = {
  [key: string]: Coin;
};
type ChangedAdapter = { to: string; from: string; change: number };

let auth: string[];

async function generateAuth() {
  auth = process.env.COINS2_AUTH?.split(",") ?? [];
  if (!auth || auth.length != 3) throw new Error("there arent 3 auth params");
}
async function queryPostgresWithRetry(
  query: any,
  sql: any,
  counter: number = 0,
): Promise<any> {
  try {
    // console.log("created a new pg instance");
    const res = await sql`
        ${query}
        `;
    return res;
  } catch (e) {
    if (counter > 5) throw e;
    await sleep(5000 + 1e4 * Math.random());
    if (counter == 3) {
      // await closeConnection();
      // sql = await getCoins2Connection();
    }
    return await queryPostgresWithRetry(query, sql, counter + 1);
  }
}
export async function translateItems(
  items: AWS.DynamoDB.DocumentClient.PutItemInputAttributeMap[],
): Promise<Coin[]> {
  const remapped: Coin[] = [];
  const errors: string[] = [];
  const redirects: { [redirect: string]: any } = {};
  items
    .filter((i) => i != null)
    .map((i) => {
      if (i.SK != 0) return;

      const {
        price,
        timestamp,
        PK,
        adapter,
        confidence,
        decimals,
        symbol,
        redirect,
        mcap,
      } = i;
      const key = PK.substring(PK.indexOf("#") + 1);
      const chain = key.substring(0, key.indexOf(":"));
      if (redirect) {
        redirects[i.PK] = redirect;
      } else if (price == null) {
        errors.push(key);
      } else {
        remapped.push({
          price,
          chain,
          timestamp,
          key,
          adapter,
          confidence,
          decimals,
          symbol,
          mcap,
        });
      }
    });

  const redirectData = await Promise.all(
    [...new Set(Object.values(redirects))].map((r: string) => {
      return getTVLOfRecordClosestToTimestamp(r, 0, 12 * 60 * 60);
    }),
  );

  redirectData.map((r: any, i: number) => {
    if (r.SK != 0 || r.price == null) {
      errors.push(Object.keys(redirects)[i]);
      return;
    }
    const targets = items.filter((i: any) => i.redirect == r.PK);

    targets.map((t: any) => {
      if (t.SK != 0) return;
      const { mcap, price } = r;
      const { timestamp, adapter, symbol, PK, confidence } = t;
      const decimals = t.decimals ?? null;
      const key = PK.substring(PK.indexOf("#") + 1);
      const chain = key.substring(0, key.indexOf(":"));
      remapped.push({
        price,
        timestamp,
        key,
        chain,
        adapter,
        confidence,
        decimals,
        symbol,
        mcap,
      });
    });
  });

  return remapped;
}
export async function queryRedis(
  values: CoinRead[],
  error: number = margin,
): Promise<CoinDict> {
  if (values.length == 0) return {};
  if (!auth) await generateAuth();
  const keys: string[] = values.map((v: CoinRead) => v.key);
  // console.log(`${values.length} queried`);

  const redis = new Redis({
    port: 6379,
    host: auth[1],
    password: auth[2],
    connectTimeout: 10000,
  });
  let res = await redis.mget(keys);
  // console.log("mget finished");
  redis.quit();
  const jsonValues: { [key: string]: Coin } = {};
  const now = getCurrentUnixTimestamp();

  res.map((v: string | null) => {
    if (!v) return;
    try {
      const json: Coin = JSON.parse(v);
      if (now - json.timestamp > error) return;
      jsonValues[json.key] = json;
    } catch {
      console.error(`error parsing: ${v}`);
    }
  });
  // console.log(`${Object.keys(jsonValues).length} found in RD`);

  return jsonValues;
}
async function queryPostgres(
  values: CoinRead[],
  target: number,
  batchPostgresReads: boolean,
): Promise<CoinDict> {
  return {};

  if (values.length == 0) return {};
  const upper: number = Number(target) + Number(margin);
  const lower: number = Number(target) - Number(margin);

  let data: Coin[] = [];

  const splitKeys = values.map((v: any) => ({
    ...v,
    key: Buffer.from(v.key.substring(v.key.split(":")[0].length + 1), "utf8"),
    chain: Buffer.from(v.key.split(":")[0], "utf8"),
  }));

  let sql;
  if (batchPostgresReads) {
    sql = await getCoins2Connection();
    data = await queryPostgresWithRetry(
      sql`
    select ${sql(pgColumns)} from splitkey where 
    key in ${sql(splitKeys.map((v: any) => v.key))}
    and chain in ${sql(splitKeys.map((v: any) => v.chain))}
    and timestamp < ${upper}
    and timestamp > ${lower}
  `,
      sql,
    );
  } else {
    await Promise.all(
      splitKeys.map(async (key) => {
        sql = await getCoins2Connection();
        const read = await queryPostgresWithRetry(
          sql`
        select ${sql(pgColumns)} from splitkey where 
        key = ${key.key}
        and chain = ${key.chain}
        and timestamp < ${Number(key.timestamp) + Number(margin)}
        and timestamp > ${Number(key.timestamp) - Number(margin)}
      `,
          sql,
        );
        if (read && read.count) {
          data.push(read as any);
        }
      }),
    );
  }
  // console.log(`${data.length} found in PG`);

  let dict: CoinDict = {};
  data.flat().map((d: Coin) => {
    const key = d.key.toString();
    const chain = d.chain.toString();
    const confidence = d.confidence / 30000;
    if (!(`${chain}:${key}` in dict)) {
      dict[`${chain}:${key}`] = {
        ...d,
        confidence,
        chain,
        key,
      };
      return;
    }
    const savedTimestamp = dict[`${chain}:${key}`].timestamp;
    if (Math.abs(savedTimestamp - target) < Math.abs(d.timestamp - target))
      return;
    dict[`${chain}:${key}`] = {
      ...d,
      confidence,
      chain,
      key,
    };
  });

  return dict;
}
function sortQueriesByTimestamp(values: CoinRead[]): CoinRead[][] {
  const now = getCurrentUnixTimestamp();
  const historicalQueries: CoinRead[] = [];

  values.map((v: CoinRead) => {
    if (v.timestamp < now - latency) historicalQueries.push(v);
  });

  return [values, historicalQueries];
}
async function combineRedisAndPostgresData(
  redisData: CoinDict,
  historicalQueries: CoinRead[],
  target: number,
  batchPostgresReads: boolean,
  error: number = margin,
): Promise<CoinDict> {
  const postgresData: CoinDict = await queryPostgres(
    historicalQueries,
    target,
    batchPostgresReads,
  );
  const combinedData: CoinDict = {};

  Object.values(redisData).map((r: Coin) => {
    const p = postgresData[r.key];
    if (p) {
      combinedData[r.key] = {
        ...r,
        price: Number(p.price),
        timestamp: Number(p.timestamp),
        confidence: Number(p.confidence),
        mcap: p.mcap,
      };
      return;
    }
    const withinMargin = Math.abs(r.timestamp - target) < error;
    if (withinMargin) {
      combinedData[r.key] = r;
      return;
    }
    // console.log(`${r.key} is stale in redis`);
  });

  return combinedData;
}
export async function readCoins2(
  values: Coin[] | CoinRead[],
  batchPostgresReads: boolean = true,
  error: number = margin,
): Promise<CoinDict> {
  if (!auth) await generateAuth();
  const [currentQueries, historicalQueries] = sortQueriesByTimestamp(values);

  const redisData: CoinDict = await queryRedis(currentQueries, error);

  return historicalQueries.length > 0
    ? await combineRedisAndPostgresData(
        redisData,
        historicalQueries,
        values[0].timestamp,
        batchPostgresReads,
        error,
      )
    : redisData;
}
export async function readFirstTimestamp(pk: string) {
  if (!auth) await generateAuth();
  const sql = await getCoins2Connection();
  const chain = Buffer.from(pk.split(":")[0], "utf8");
  const key = Buffer.from(pk.substring(pk.split(":")[0].length + 1), "utf8");
  const read = await sql`
    select MIN (timestamp) from splitkey where 
    chain = ${chain} and key = ${key}
  `;
  if (read[0] && read[0].min) return read[0].min;
}
function cleanTimestamps(values: Coin[], margin: number = 15 * 60): Coin[] {
  const timestamps = values.map((c: Coin) => c.timestamp);
  const maxTimestamp = Math.max(...timestamps);
  const minTimestamp = Math.min(...timestamps);

  if (
    maxTimestamp - minTimestamp > margin &&
    process.env.DEFILLAMA_SDK_MUTED != "true"
  )
    throw new Error("mixed timestamps are unsupported");

  return values.map((c: Coin) => ({ ...c, timestamp: maxTimestamp }));
}
async function findRedisWrites(
  values: Coin[],
  storedRecords: CoinDict,
  source?: string,
): Promise<Coin[]> {
  const writesToRedis: Coin[] = [];
  values.map((c: Coin) => {
    const record = storedRecords[c.key];
    if (!record || record.timestamp < c.timestamp) {
      writesToRedis.push(c);
    } else {
      // console.log(
      //   `${c.key} already fresher in redis (${record.timestamp} stored vs: ${c.timestamp})`,
      // );
    }
  });

  const filtered: CoinDict = {};
  writesToRedis.map((c: Coin) => {
    if (
      (c.symbol && (zeroDecimalAdapters.includes(c.adapter) || c.decimals)) ||
      c.key == "tezos:tezos" ||
      c.key?.startsWith("bitcoin:")
    )
      filtered[c.key] = c;
  });

  return await checkMetadataChanges(filtered, writesToRedis, source);
}
async function checkMetadataChanges(
  writes: CoinDict,
  storedRecords: Coin[],
  source: string = "UNKNOWN",
): Promise<Coin[]> {
  const filtered: Coin[] = [];
  let errors: string = ``;
  storedRecords.map((c: Coin) => {
    const record = writes[c.key];
    if (record && record.decimals != c.decimals)
      errors += `\n${c.key} is trying to change metadata from ${record.decimals} to ${c.decimals} source: ${source}, skipping!!`;
    // else if (record && record.symbol != c.symbol)
    //   errors += `\n${c.key} is trying to change metadata from ${record.symbol} to ${c.symbol} source: ${source}, skipping!!`;
    else filtered.push(c);
  });

  if (errors.length)
    await sendMessage(errors, process.env.STALE_COINS_ADAPTERS_WEBHOOK!);
  return filtered;
}
async function storeChangedAdapter(changedAdapters: {
  [key: string]: ChangedAdapter;
}) {
  try {
    if (Object.keys(changedAdapters).length == 0) return;
    if (!auth) await generateAuth();
    let sql = await getCoins2Connection();

    const inserts: ChangedAdapter[] = Object.entries(changedAdapters).map(
      ([key, c]) => ({
        key,
        from: c.from,
        to: c.to,
        change: c.change,
      }),
    );

    if (inserts.length)
      await queryPostgresWithRetry(
        sql`
      insert into adapterchanges
      ${sql(inserts, ...changedAdapterColumns)}
      on conflict (key)
      do nothing
      `,
        sql,
      );
  } catch (e) {
    console.error(`storeChangedAdapters failed with: ${e}`);
  }
}
async function cleanConfidences(
  values: Coin[],
  storedRecords: CoinDict,
): Promise<Coin[]> {
  const confidentValues: Coin[] = [];
  const changedAdapters: { [key: string]: ChangedAdapter } = {};

  values.map((c: Coin) => {
    if (c.confidence < confidenceThreshold) return;
    const storedRecord = storedRecords[c.key];
    if (!storedRecord) {
      confidentValues.push(c);
      return;
    }
    if (c.confidence < storedRecord.confidence) return;
    if (c.adapter && c.adapter != storedRecord.adapter) {
      const change =
        (100 * Math.abs(c.price - storedRecord.price)) / storedRecord.price;
      if (change < 5 || ["minswap", "sundaeswap"].includes(c.adapter)) return;
      changedAdapters[c.key] = {
        to: c.adapter,
        from: storedRecord.adapter,
        change,
      };
    }
    confidentValues.push(c);
  });

  // await storeChangedAdapter(changedAdapters);
  return confidentValues;
}
export async function writeToRedis(
  strings: {
    [key: string]: string;
  },
  source: string = "UNKNOWN",
): Promise<void> {
  if (Object.keys(strings).length == 0) return;
  // console.log("starting mset");

  const key = "";
  let debug = strings[key];
  const query = "price";
  try {
    if (debug) {
      let ob = JSON.parse(debug);
      const real = await fetch(
        `https://coins.llama.fi/prices/current/${key}`,
      ).then((r) => r.json());
      const realData = real.coins[key][query];
      if (Math.abs(ob[query] - realData) / realData > 0.05) {
        await sendMessage(
          `redis ${query} is being written as ${ob[query]} when it should be about ${realData}!! SOURCE: ${source}`,
          process.env.STALE_COINS_ADAPTERS_WEBHOOK!,
        );
      }
    }
  } catch (e) {
    await sendMessage(
      `Redis debug error: ${e}`,
      process.env.STALE_COINS_ADAPTERS_WEBHOOK!,
    );
  }
  try {
    if (!auth) await generateAuth();
    const redis = new Redis({
      port: 6379,
      host: auth[1],
      password: auth[2],
      connectTimeout: 10000,
    });
    await redis.mset(strings);
    redis.quit();
  } catch (e) {
    await sendMessage(
      `write to coins redis is fugged with ${e}`,
      process.env.STALE_COINS_ADAPTERS_WEBHOOK!,
    );
  }
}
async function writeToPostgres(values: Coin[]): Promise<void> {
  if (values.length == 0) return;

  values.map((v: Coin) => {
    if (v.price == null || !v.timestamp || !v.key || !v.confidence)
      console.log(`${v.key} entry is invalid oops`);
  });
  const splitKey = values.map((v: Coin) => ({
    ...v,
    key: Buffer.from(v.key.substring(v.key.indexOf(":") + 1), "utf8"),
    chain: Buffer.from(v.key.split(":")[0], "utf8"),
    mcap: v.mcap ? Math.round(v.mcap) : null,
    confidence: Math.round(v.confidence * 30000),
  }));
  try {
    // console.log("creating a new pg instance");
    let sql = await getCoins2Connection();
    // console.log("created a new pg instance");
    await queryPostgresWithRetry(
      sql`
      insert into splitkey
      ${sql(
        splitKey,
        "chain",
        "key",
        "timestamp",
        "price",
        "confidence",
        "mcap",
      )}
      on conflict (key, chain, timestamp) 
      do nothing
      `,
      sql,
    );
  } catch (e) {
    await sendMessage(
      `write to coins pg is fugged with ${e}`,
      process.env.STALE_COINS_ADAPTERS_WEBHOOK!,
    );
  }
}
export async function writeCoins2(
  values: any[],
  batchPostgresReads: boolean = true,
  margin?: number,
  source?: string,
) {
  if (!auth) await generateAuth();
  const cleanValues = batchPostgresReads
    ? cleanTimestamps(values, margin)
    : values;
  const storedRecords = await readCoins2(cleanValues, batchPostgresReads);
  values = await cleanConfidences(values, storedRecords);
  const writesToRedis = await findRedisWrites(values, storedRecords, source);
  const strings: { [key: string]: string } = {};
  writesToRedis.map((v: Coin) => {
    strings[v.key] = JSON.stringify(v);
  });

  await writeToRedis(strings, source);
  // await Promise.all([
  //   writeToPostgres(values),
  //writeToRedis(strings, source)
  // ]);
  // await closeConnection();
}
export async function batchWrite2(
  values: Coin[],
  batchPostgresReads: boolean = true,
  margin: number = 15 * 60,
  source?: string,
) {
  await writeCoins2(values, batchPostgresReads, margin, source);
}
export async function batchReadPostgres(
  key: string,
  start: number,
  end: number,
): Promise<any[]> {
  if (!auth) await generateAuth();
  let sql = await getCoins2Connection();
  const chain = key.split(":")[0];
  const address = key.substring(key.split(":")[0].length + 1);
  let data = await queryPostgresWithRetry(
    sql`
    select ${sql(pgColumns)} from splitkey where 
    key in ${sql([Buffer.from(address, "utf8")])}
    and 
    chain in ${sql([Buffer.from(chain, "utf8")])}
    and
    timestamp > ${start} 
    and 
    timestamp < ${end}
    `,
    sql,
  ); //start  1696287600
  return data;
}
