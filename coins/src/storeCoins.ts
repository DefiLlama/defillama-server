import adapters from "./adapters/index";
import { batchWrite } from "./utils/shared/dynamodb";
import { storePks, checkOutdated } from "./listCoins";

export default async function runAll() {
  for (let adapter of Object.entries(adapters)) {
    let results = await adapter[1][adapter[0]]();
    if (Array.isArray(results[0])) {
      results = results.reduce((p: any, c: any) => [...p, ...c], []);
    }
    storePks(results);
    batchWrite(results, true);
  }
  //checkOutdated();
} // ts-node coins/src/storeCoins.ts
//runAll();