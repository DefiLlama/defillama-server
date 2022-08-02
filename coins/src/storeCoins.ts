import adapters from "./adapters/index";
import { batchWrite } from "./utils/shared/dynamodb";
import { storePks, checkOutdated } from "./listCoins";

export default async function runAll() {
  await Promise.all(Object.entries(adapters).map(async adapter=>{
    let results = await adapter[1][adapter[0]]();
    if (Array.isArray(results[0])) {
      results = results.reduce((p: any, c: any) => [...p, ...c], []);
    }
    //await storePks(results);
    await batchWrite(results, true);
  }))
  //checkOutdated();
} // ts-node coins/src/storeCoins.ts
//runAll();