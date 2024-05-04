import { getCurrentUnixTimestamp, secondsInDay } from "../../src/utils/date";
import PromisePool from "@supercharge/promise-pool";
import findTvls from "../tvl";
import storeHistorical from "../storeToDb";
import setEnvSecrets from "../../src/utils/shared/setEnvSecrets";

const end = getCurrentUnixTimestamp();
const start = getStart("2024-01-01");

// takes 2024-01-01 format
function getStart(dateString: string): number {
  const raw = new Date(`${dateString}T00:00:00`);
  return Math.floor(raw.getTime() / 1000);
}
function getTimestampArray(start: number, end: number) {
  const arr: number[] = [];
  while (end > start) {
    end -= secondsInDay;
    arr.push(end);
  }
  return arr;
}
const timestampArray: number[] = getTimestampArray(start, end);

async function proc(timestamp: number) {
  const res: any = await findTvls(timestamp);
  res.timestamp = timestamp;
  res.avalanche = res.avax;
  await storeHistorical(res);
}
async function backfill() {
  await setEnvSecrets();
  const errors: number[] = [];
  let successCount: number = 0;
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

backfill(); // ts-node defi/l2/backfill.ts
