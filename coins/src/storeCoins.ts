import adapters from "./adapters/index";
import { batchWrite } from "./utils/shared/dynamodb";
import { filterWritesWithLowConfidence } from "./adapters/utils/database";

export default async function handler(event: any) {
  const a = Object.entries(adapters);
  const timestamp = 0;
  await Promise.all(
    event.protocolIndexes.map(async (i: any) => {
      try {
        const results: any[] = await a[i][1][a[i][0]](timestamp);
        const resultsWithoutDuplicates = filterWritesWithLowConfidence(
          results.flat()
        );
        await batchWrite(resultsWithoutDuplicates, true);
      } catch (e) {
        console.log("adapter failed", a[i][0], e);
      }
    })
  );
} // ts-node coins/src/storeCoins.ts
async function main() {
  let a = { protocolIndexes: [0] };
  await handler(a);
}
main();
