import adapters from "../adapters/index";
import { batchWrite } from "../utils/shared/dynamodb";
import { filterWritesWithLowConfidence } from "../adapters/utils/database";
import { withTimeout } from "../utils/shared/withTimeout";
import setEnvSecrets from "../utils/shared/setEnvSecrets";
import PromisePool from "@supercharge/promise-pool";

// CHOOSE YOUR TIMESTAMPS AND PROTOCOLS HERE
const batchStep = 2000; // USUALLY NO NEED TO CHANGE
// const start = 1718301600;
const start = Math.floor(+new Date("2022-12-12") / 1e3);
const timeStep = 43200; // 12 HOURS
// const end = 1718561086;
const end = Math.floor(+new Date() / 1e3);
const fillRecentFirst = true;
const timeout = process.env.LLAMA_RUN_LOCAL ? 8400000 : 1740000; //29mins
const adaptersTorefill: string[] = ["uniswap"]; // FROM adapters list at ./adapters/index.ts

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
