import {
  addToDBWritesList,
  filterWritesWithLowConfidence,
} from "../adapters/utils/database";
import { Write } from "../adapters/utils/dbInterfaces";
import { getCurrentUnixTimestamp } from "../utils/date";
import {
  batchGet,
  batchWrite,
  DELETE,
  getHistoricalValues,
} from "../utils/shared/dynamodb";

const start: number = 1690761600;
const coins: string[] = [
  "asset#ethereum:0x1cebdb0856dd985fae9b8fea2262469360b8a3a6",
  "asset#ethereum:0xed4064f376cb8d68f770fb1ff088a3d0f3ff5c4d",
];
const batchStep: number = 100;
const frequency: number = 6 * 60 * 60; // 6 hours

function createTimestampArray(start: number, end: number, timeStep: number) {
  const timestampArray = [];
  let workingNumber = start;
  while (workingNumber < end + 1) {
    timestampArray.push(workingNumber);
    workingNumber += timeStep;
  }
  return timestampArray;
}

async function main() {
  let metadata = await batchGet(
    coins.map((PK) => ({
      PK,
      SK: 0,
    })),
  );

  for (let i = 0; i < coins.length; i += batchStep) {
    const current = await Promise.all(
      coins.slice(i, i + batchStep).map((t) => getHistoricalValues(t, start)),
    );

    await DELETE(current.flat());
  }

  const timestampArray = createTimestampArray(
    start,
    getCurrentUnixTimestamp(),
    frequency,
  );

  const results: Write[] = [];

  timestampArray.map((timestamp) => {
    coins.map((coin, i) =>
      addToDBWritesList(
        results,
        coin.split(":")[0].substring(coin.indexOf("#") + 1),
        coin.split(":")[1],
        0,
        metadata[i].decimals,
        metadata[i].symbol,
        timestamp,
        "markdown",
        1,
      ),
    );
  });

  const resultsWithoutDuplicates = await filterWritesWithLowConfidence(
    results.flat(),
  );
  for (let i = 0; i < resultsWithoutDuplicates.length; i += batchStep) {
    await batchWrite(resultsWithoutDuplicates.slice(i, i + batchStep), true);
  }

  return metadata;
}

main(); // ts-node coins/src/cli/markdownCoinHistorically.ts
