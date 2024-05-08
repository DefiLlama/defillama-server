import { getCurrentUnixTimestamp, secondsInDay } from "../../src/utils/date";
import PromisePool from "@supercharge/promise-pool";
import findTvls from "../tvl";
import { overwrite, parsePgData } from "../storeToDb";
import setEnvSecrets from "../../src/utils/shared/setEnvSecrets";
import postgres from "postgres";
import { queryPostgresWithRetry } from "../layer2pg";
import { ChartData } from "../types";

// any mappings for chains in proc() needed??
/// select your chains in constants first!!!
const start: number = 1708214400;
const end: number = getCurrentUnixTimestamp();

let auth: string[] = [];
async function iniDbConnection() {
  await setEnvSecrets();
  auth = process.env.COINS2_AUTH?.split(",") ?? [];
  if (!auth || auth.length != 3) throw new Error("there arent 3 auth params");

  return postgres(auth[0], { idle_timeout: 90 });
}

async function getTimestampArray(): Promise<number[]> {
  const sql = await iniDbConnection();

  const timeseries = await queryPostgresWithRetry(sql`select * from chainassets`, sql);
  sql.end();
  const raw = parsePgData(timeseries, "*");
  const timestamps = raw.map((r: ChartData) => Number(r.timestamp));
  let timestamp = Math.floor(start / secondsInDay) * secondsInDay;
  let cleanEnd = Math.floor(end / secondsInDay) * secondsInDay;

  const filteredTimestamps: number[] = [];
  while (timestamp < cleanEnd) {
    const index = timestamps.indexOf(
      timestamps.reduce((p, c) => (Math.abs(c - timestamp) < Math.abs(p - timestamp) ? c : p))
    );
    filteredTimestamps.push(Number(raw[index].timestamp));
    timestamp += secondsInDay;
  }

  return filteredTimestamps;
}

async function proc(timestamp: number) {
  const res: any = await findTvls(timestamp);
  const write: any = { starknet: res.starknet, timestamp };
  await overwrite(write);
}

async function backfill() {
  const errors: number[] = [];
  let successCount: number = 0;
  const timestampArray = await getTimestampArray();
  await PromisePool.withConcurrency(5)
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
