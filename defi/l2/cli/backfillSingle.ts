import { getCurrentUnixTimestamp, secondsInDay } from "../../src/utils/date";
import PromisePool from "@supercharge/promise-pool";
import findTvls from "../tvl";
import { overwrite, parsePgData } from "../storeToDb";
import setEnvSecrets from "../../src/utils/shared/setEnvSecrets";
import postgres from "postgres";
import { queryPostgresWithRetry } from "../../src/utils/shared/bridgedTvlPostgres";
import { ChartData } from "../types";

// any mappings for chains in proc() needed??
/// select your chains in constants first!!!
// check ../utils.ts L28 for dependancies
const start: number = 1729094263;
const end: number = getCurrentUnixTimestamp();
const chain: string = "Tron";

let auth: string[] = [];
async function iniDbConnection() {
  await setEnvSecrets();
  auth = process.env.PG_AUTH?.split(",") ?? [];
  if (!auth || auth.length != 3) throw new Error("there aren't 3 auth params");

  return postgres(auth[0], { idle_timeout: 90 });
}

async function getTimestampArray(): Promise<number[]> {
  const sql = await iniDbConnection();

  const timeseries = await queryPostgresWithRetry(sql`select ${sql(chain, "timestamp")} from chainassets`, sql);
  sql.end();
  const raw = parsePgData(timeseries, chain);
  const timestamps = raw.map((r: ChartData) => Number(r.timestamp));
  let timestamp = Math.floor(start / secondsInDay) * secondsInDay;
  let cleanEnd = Math.floor(end / secondsInDay) * secondsInDay;

  const filteredTimestamps: number[] = [];
  while (timestamp < cleanEnd) {
    const index = timestamps.indexOf(
      timestamps.reduce((p, c) => (Math.abs(c - timestamp) < Math.abs(p - timestamp) ? c : p))
    );
    if (raw[index].data.total < 10_000_000_000) filteredTimestamps.push(Number(raw[index].timestamp));
    timestamp += secondsInDay;
  }

  return filteredTimestamps.reverse();
}

async function proc(timestamp: number) {
  const res: any = await findTvls(false, timestamp);
  if (res.Tron.total.total < 10_000_000_000) throw new Error(`bad tvl`);
  const write: any = { Tron: res.Tron, timestamp };
  await overwrite(write);
  console.log(`DONE ${timestamp}`);
}

async function backfill() {
  const errors: number[] = [];
  let successCount: number = 0;
  const timestampArray = await getTimestampArray();
  await PromisePool.withConcurrency(1)
    .for(timestampArray)
    .process(async (timestamp) =>
      proc(timestamp)
        .then(() => {
          successCount += 1;
          console.log(`done ${successCount}/${timestampArray.length}`);
        })
        .catch((e) => {
          console.log(e);
          errors.push(timestamp);
        })
    );

  console.log(errors.toString());
}

backfill(); // ts-node defi/l2/cli/backfillSingle.ts
