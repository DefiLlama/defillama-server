import adapters from "./adapters/index";
import { batchWrite } from "./utils/shared/dynamodb";
import { storePks, checkOutdated } from "./listCoins";

export default function(){
  return runAll(0);
}

async function runAll(timestamp:number) {
  let promises = Object.entries(adapters).map((a: any) => {
    return a[1][a[0]](timestamp);
    // .catch(
    //   () => `adapter for ${a[0]} has failed`
    // );
  });
  let results = await Promise.all(promises);
  for (let i = 0; i < results.length; i++) {
    if (typeof results[i] == "string") new Error(results[i]);
  }
  results = results
    .filter((r: any) => r.length > 0 && typeof r != "string")
    .reduce((p: any, c: any) => [...p, ...c], []);
  for (let i = 0; i < results.length; i++) {
    console.log(`${results[i].length} ${Object.keys(adapters)[i]} entries`);
  }
  results = results.reduce((p: any, c: any) => {
    if (Array.isArray(c)) {
      return [...p, ...c];
    } else {
      return [...p, c];
    }
  }, []);
  console.log(`writing ${results.length} results to DB`);
  await batchWrite(results, true);
  console.log(`written data for timestamp ${timestamp} to DB`);
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
