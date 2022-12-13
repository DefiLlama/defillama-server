import adapters from "./adapters/index";
import { batchWrite } from "./utils/shared/dynamodb";
import { filterWritesWithLowConfidence } from "./adapters/utils/database";

// CHOOSE YOUR TIMESTAMPS AND PROTOCOLS HERE
const batchStep = 2000; // USUALLY NO NEED TO CHANGE
const start = 1670155200;
const timeStep = 43200; // 12 HOURS
const end = 1670932800;
const indexes = [0]; // FROM adapters list at ./adapters/index.ts

function createTimestampArray() {
  const timestampArray = [];
  let workingNumber = start;
  while (workingNumber < end + 1) {
    timestampArray.push(workingNumber);
    workingNumber += timeStep;
  }
  return timestampArray;
}
async function handler(indexes: number[], timestamp: number) {
  const a = Object.entries(adapters);
  await Promise.all(
    indexes.map(async (i: any) => {
      try {
        const results: any[] = await a[i][1][a[i][0]](timestamp);
        const resultsWithoutDuplicates = filterWritesWithLowConfidence(
          results.flat()
        );
        for (let i = 0; i < resultsWithoutDuplicates.length; i += batchStep) {
          await batchWrite(
            resultsWithoutDuplicates.slice(i, i + batchStep),
            true
          );
        }
      } catch (e) {
        console.log("adapter failed", a[i][0], e);
      }
    })
  );
} // ts-node coins/src/refill.ts
async function main() {
  const timestampArray = createTimestampArray();
  for (let i of timestampArray) {
    await handler(indexes, i);
  }
}
main();
