import adapters from "../adapters/index";
import {
  batchGet,
  batchWrite,
  DELETE,
  getHistoricalValues,
} from "../utils/shared/dynamodb";
import { filterWritesWithLowConfidence } from "../adapters/utils/database";
import { withTimeout } from "../utils/shared/withTimeout";
import setEnvSecrets from "../utils/shared/setEnvSecrets";
import PromisePool from "@supercharge/promise-pool";
import { getCurrentUnixTimestamp } from "../utils/date";

// CHOOSE YOUR TIMESTAMPS AND PROTOCOLS HERE
const batchStep = 2000; // USUALLY NO NEED TO CHANGE
const start = 1719241398;
// const start = Math.floor(+new Date("2022-12-12") / 1e3);
const timeStep = 60 * 60; // 1 HOUR
const end = getCurrentUnixTimestamp();
// const end = Math.floor(+new Date() / 1e3);
const fillRecentFirst = false;
const timeout = process.env.LLAMA_RUN_LOCAL ? 8400000 : 1740000; //29mins
const adaptersTorefill: string[] = [
  "curve",
  "curve1",
  "curve2",
  "curve3",
  "curve4",
  "curve5",
  "curve7",
  "curve9",
  "curve12",
  "curve13",
  "aave",
  "pendle",
]; // FROM adapters list at ./adapters/index.ts

function createTimestampArray() {
  const timestampArray = [];
  let workingNumber = start;
  while (workingNumber < end + 1) {
    timestampArray.push(workingNumber);
    workingNumber += timeStep;
  }
  return fillRecentFirst ? timestampArray.reverse() : timestampArray;
}

async function handler(adapterTorefill: string, timestamp: number) {
  const a = Object.entries(adapters).filter(
    ([name]) => name === adapterTorefill,
  );
  try {
    const bs: any = a[0][1];
    const adapterFn = typeof bs === "function" ? bs : bs[adapterTorefill];
    const results = await withTimeout(timeout, adapterFn(timestamp));
    const resultsWithoutDuplicates = await filterWritesWithLowConfidence(
      results.flat(),
    );

    // USE THIS IF INCORRECT DATA HAS BEEN WRITTEN
    // END TIMESTAMP MUST BE NOW
    // for (let i = 0; i < resultsWithoutDuplicates.length; i += batchStep) {
    //   let current = await Promise.all(
    //     resultsWithoutDuplicates
    //       .slice(i, i + batchStep)
    //       .map((t) => getHistoricalValues(t.PK, start)),
    //   );

    //   await DELETE(current.flat());
    // }

    for (let i = 0; i < resultsWithoutDuplicates.length; i += batchStep) {
      await batchWrite(resultsWithoutDuplicates.slice(i, i + batchStep), true);
    }
    console.log(
      "filled protocol:",
      a[0][0],
      "  day:",
      new Date(timestamp * 1e3),
    );
  } catch (e) {
    console.log("adapter failed", a[0][0], timestamp);
  }
} // ts-node coins/src/cli/refill.ts
async function main() {
  await setEnvSecrets();
  const timestampArray = createTimestampArray();
  for (let i of timestampArray) {
    await PromisePool.withConcurrency(10)
      .for(adaptersTorefill)
      .process(async (a: any) =>
        handler(a, i).catch((e) => {
          e;
        }),
      );
  }
  return;
}
main();
