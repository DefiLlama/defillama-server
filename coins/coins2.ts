import { DbEntry } from "./src/adapters/utils/dbInterfaces";
import getTVLOfRecordClosestToTimestamp from "./src/utils/shared/getRecordClosestToTimestamp";
import { getCurrentUnixTimestamp } from "./src/utils/date";
import { Redis } from "ioredis";
import postgres from "postgres";

const read: boolean = false;
const pgColumns: string[] = ["key", "timestamp", "price", "confidence"];
const latency: number = 1 * 60 * 60; // 1hr
const margin: number = 12 * 60 * 60; // 12hr
const confidenceThreshold: number = 0.3;

type Coin = {
  price: number;
  timestamp: number;
  key: string;
  adapter: string;
  confidence: number;
  decimals?: number;
  symbol: string;
};
type CoinDict = {
  [key: string]: Coin;
};

let auth: string[];

async function generateAuth() {
  auth = process.env.COINS2_AUTH?.split(",") ?? [];
  if (!auth || auth.length != 3) throw new Error("there arent 3 auth params");
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
        PK: key,
        adapter,
        confidence,
        decimals,
        symbol,
        redirect,
      } = i;

      if (redirect) {
        redirects[redirect] = i;
      } else if (price == null) {
        errors.push(key);
      } else {
        remapped.push({
          price,
          timestamp,
          key,
          adapter,
          confidence,
          decimals,
          symbol,
        });
      }
    });

  const redirectData = await Promise.all(
    Object.values(redirects).map((r: DbEntry) => {
      return getTVLOfRecordClosestToTimestamp(r.redirect, r.SK, 12 * 60 * 60);
    }),
  );

  redirectData.map((r: any, i: number) => {
    if (r.SK != 0 || r.price == null) {
      errors.push(Object.keys(redirects)[i]);
      return;
    }

    const timestamp = redirects[r.PK].timestamp ?? getCurrentUnixTimestamp();
    const adapter = redirects[r.PK].adapter ?? null;
    const decimals = redirects[r.PK].decimals ?? null;
    const { PK: key, confidence, symbol } = redirects[r.PK];

    remapped.push({
      price: r.price,
      timestamp,
      key,
      adapter,
      confidence,
      decimals,
      symbol,
    });
  });

  // console.error(`${errors.length} errors in translating to coins2`);

  return remapped;
}
async function queryRedis(values: Coin[]): Promise<CoinDict> {
  if (values.length == 0) return {};
  const keys: string[] = values.map((v: Coin) => v.key);

  // console.log(`${values.length} queried`);

  const redis = new Redis({
    port: 6379,
    host: auth[1],
    password: auth[2],
  });
  let res = await redis.mget(keys);
  // console.log("mget finished");
  redis.quit();
  const jsonValues: { [key: string]: Coin } = {};
  res.map((v: string | null) => {
    if (!v) return;
    try {
      const json: Coin = JSON.parse(v);
      jsonValues[json.key] = json;
    } catch {
      console.error(`error parsing: ${v}`);
    }
  });
  // console.log(`${Object.keys(jsonValues).length} found in RD`);

  return jsonValues;
}
async function queryPostgres(
  values: Coin[],
  target: number,
  batchPostgresReads: boolean,
): Promise<CoinDict> {
  if (values.length == 0) return {};
  const upper: number = target + margin;
  const lower: number = target - margin;

  let data: Coin[] = [];

  let sql;
  if (batchPostgresReads) {
    sql = postgres(auth[0]);
    data = await sql`
        select ${sql(pgColumns)} from main where 
        key in ${sql(values.map((v: Coin) => v.key))}
        and timestamp < ${upper}
        and timestamp > ${lower}
      `;
  } else {
    sql = postgres(auth[0]);
    for (let i = 0; i < values.length; i++) {
      const read = await sql`
          select ${sql(pgColumns)} from main where 
          key = ${values[i].key}
          and timestamp < ${upper}
          and timestamp > ${lower}
        `;
      if (read.count) {
        data.push(read as any);
      }
    }
  }
  sql.end();
  // console.log(`${data.length} found in PG`);

  let dict: CoinDict = {};
  data.map((d: Coin) => {
    if (!(d.key in dict)) {
      dict[d.key] = d;
      return;
    }
    const savedTimestamp = dict[d.key].timestamp;
    if (Math.abs(savedTimestamp - target) < Math.abs(d.timestamp - target))
      return;
    dict[d.key] = d;
  });

  return dict;
}
function sortQueriesByTimestamp(values: Coin[]): Coin[][] {
  const now = getCurrentUnixTimestamp();
  const historicalQueries: Coin[] = [];

  values.map((v: Coin) => {
    if (v.timestamp < now - latency) historicalQueries.push(v);
  });

  return [values, historicalQueries];
}
async function combineRedisAndPostgresData(
  redisData: CoinDict,
  historicalQueries: Coin[],
  target: number,
  batchPostgresReads: boolean,
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
      };
      return;
    }
    const withinMargin = Math.abs(r.timestamp - target) < margin;
    if (withinMargin) {
      combinedData[r.key] = r;
      return;
    }
    // console.log(`${r.key} is stale`);
  });

  return combinedData;
}
async function readCoins2(
  values: Coin[],
  batchPostgresReads: boolean = true,
): Promise<CoinDict> {
  await generateAuth();
  const [currentQueries, historicalQueries] = sortQueriesByTimestamp(values);

  const redisData: CoinDict = await queryRedis(currentQueries);

  return historicalQueries.length > 0
    ? await combineRedisAndPostgresData(
        redisData,
        historicalQueries,
        values[0].timestamp,
        batchPostgresReads,
      )
    : redisData;
}
function cleanTimestamps(values: Coin[], margin: number = 15 * 60): Coin[] {
  const timestamps = values.map((c: Coin) => c.timestamp);
  const maxTimestamp = Math.max(...timestamps);
  const minTimestamp = Math.min(...timestamps);

  if (maxTimestamp - minTimestamp > margin)
    throw new Error("mixed timestamps are unsupported");

  return values.map((c: Coin) => ({ ...c, timestamp: maxTimestamp }));
}
function findRedisWrites(values: Coin[], storedRecords: CoinDict): Coin[] {
  const writesToRedis: Coin[] = [];
  values.map((c: Coin) => {
    const record = storedRecords[c.key];
    if (!record || record.timestamp < c.timestamp) {
      writesToRedis.push(c);
    } else {
      console.log(
        `${c.key} already fresher in redis (${record.timestamp} stored vs: ${c.timestamp})`,
      );
    }
  });

  return writesToRedis;
}
function cleanConfidences(values: Coin[], storedRecords: CoinDict): Coin[] {
  const confidentValues: Coin[] = [];

  values.map((c: Coin) => {
    if (c.confidence < confidenceThreshold) return;
    const storedRecord = storedRecords[c.key];
    if (!storedRecord) {
      confidentValues.push(c);
      return;
    }
    if (c.confidence < storedRecord.confidence) return;
    confidentValues.push(c);
  });

  return confidentValues;
}
async function writeToRedis(strings: { [key: string]: string }): Promise<void> {
  if (Object.keys(strings).length == 0) return;
  // console.log("starting mset");

  const redis = new Redis({
    port: 6379,
    host: auth[1],
    password: auth[2],
  });
  await redis.mset(strings);
  redis.quit();
  // console.log("mset finished");
}
async function writeToPostgres(values: Coin[]): Promise<void> {
  if (values.length == 0) return;

  // console.log("creating a new pg instance");
  const sql = postgres(auth[0]);
  // console.log("created a new pg instance");
  await sql`
      insert into main
      ${sql(values, "key", "timestamp", "price", "confidence")}
      on conflict (key, timestamp) do nothing
      `;
  sql.end();
}
export async function writeCoins2(
  values: Coin[],
  batchPostgresReads: boolean = true,
  margin?: number,
) {
  const step = 100;
  for (let i = 0; i < values.length; i += step) {
    let theseValues = values.slice(i, i + step);
    // console.log(`${values.length} values entering`);
    const cleanValues = batchPostgresReads
      ? cleanTimestamps(theseValues, margin)
      : theseValues;
    const storedRecords = await readCoins2(cleanValues, batchPostgresReads);
    theseValues = cleanConfidences(theseValues, storedRecords);
    const writesToRedis = findRedisWrites(theseValues, storedRecords);
    const strings: { [key: string]: string } = {};
    writesToRedis.map((v: Coin) => {
      strings[v.key] = JSON.stringify(v);
    });

    await writeToPostgres(theseValues);
    await writeToRedis(strings);
  }
}
export async function batchWrite2(
  values: Coin[],
  batchPostgresReads: boolean = true,
  margin: number = 15 * 60,
) {
  read
    ? await readCoins2(values, batchPostgresReads)
    : await writeCoins2(values, batchPostgresReads, margin);
}
