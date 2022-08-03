import adapters from "./adapters/index";
import { batchWrite } from "./utils/shared/dynamodb";
import { storePks, checkOutdated } from "./listCoins";

export default function () {
  return runAll(0);
}

async function runAll(timestamp: number) {
  await Promise.all(
    Object.entries(adapters).map(async (a) => {
      try {
        const results: any[] = await a[1][a[0]](timestamp);
        await batchWrite(results.flat(), true);
      } catch (e) {
        console.log("adapter failed", a[0], e);
      }
    })
  );
} // ts-node coins/src/storeCoins.ts

async function main() {
  const timestamps = [
    // 1658962800,
    // 1659006000,
    // 1659049200,
    // 1659092400,
    // 1659135600,
    // 1659178800,
    // 1659222000,
    // 1659265200,
    // 1659308400,
    // 1659351600
    1659394800,
    1659428583
  ];
  for (let i = 0; i < timestamps.length; i++) {
    await runAll(timestamps[i]);
  }
}
runAll(0);
