import adapters from "./adapters/index";
import { batchWrite } from "./utils/shared/dynamodb";
import { storePks, checkOutdated } from "./listCoins";

export default async function runAll() {
  let results = await Promise.all(
    Object.entries(adapters).map((a: any) => {
      return a[1][a[0]]();
    })
  );
  results = results
    .reduce((p: any, c: any) => [...p, ...c], [])
    .reduce((p: any, c: any) => {
      if (Array.isArray(c)) {
        return [...p, ...c];
      } else {
        return [...p, c];
      }
    }, []);
  await batchWrite(results, true);
} // ts-node coins/src/storeCoins.ts
runAll();
