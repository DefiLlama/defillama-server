import adapters from "../adapters/index";
import { batchWrite } from "../utils/shared/dynamodb";
import { filterWritesWithLowConfidence } from "../adapters/utils/database";

// CHOOSE YOUR TIMESTAMPS AND PROTOCOLS HERE
const batchStep = 2000; // USUALLY NO NEED TO CHANGE
// const start = 1670155200;
const start = Math.floor((+new Date('2022-12-12')/1e3));
const timeStep = 43200; // 12 HOURS
// const end = 1670932800;
const end = Math.floor(+new Date()/1e3);
const fillRecentFirst = true;
const indexes = [0]; // FROM adapters list at ./adapters/index.ts

function createTimestampArray() {
  const timestampArray = [];
  let workingNumber = start;
  while (workingNumber < end + 1) {
    timestampArray.push(workingNumber);
    workingNumber += timeStep;
  }
  return fillRecentFirst ? timestampArray.reverse() : timestampArray
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
        console.log('filled protocol:', a[i][0], '  day:', new Date(timestamp * 1e3))
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
