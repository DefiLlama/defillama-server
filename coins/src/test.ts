// catch unhandled errors
process.on("uncaughtException", (err) => {
  console.error('uncaught error', err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error('unhandled rejection', err);
  process.exit(1);
});

import adapters from "./adapters/index";
import { filterWritesWithLowConfidence } from "./adapters/utils/database";
import { logTable } from '@defillama/sdk'

if (process.argv.length < 3) {
  console.error(`Missing argument, you need to provide the adapter name.
    Eg: ts-node coins/src/test.ts euler`);
  process.exit(1);
}
const protocol = process.argv[2];
const values = 4;

function selectRandom(max: number) {
  const results = [];
  for (let i = 0; i < values; i++) {
    results.push(Math.floor(Math.random() * max));
  }
  return results;
}

async function main() {
  console.log(`==== Testing ${protocol} ====`);
  const protocolWrapper = (adapters as any)[protocol]
  if (!protocolWrapper) {
    console.log(
      `The passed protocol name is invalid. Make sure '${protocol}' is a key of './adapters/index.ts'`
    );
  }

  const adapterFn = typeof protocolWrapper === 'function' ? protocolWrapper : protocolWrapper[protocol];
  const results = await adapterFn(0)
  let resultsWithoutDuplicates = results.flat()
  try {
    resultsWithoutDuplicates = await filterWritesWithLowConfidence(resultsWithoutDuplicates)
  } catch (e) {
    if (!process.env.LOCAL_TEST)
    console.error('Error filtering low confidence writes', e)
  }


  const lTable: any = []
  resultsWithoutDuplicates.forEach((i: any) => {
    lTable[i.PK] = { symbol: i.symbol, price: i.price ?? i.redirect, decimals: i.decimals, PK: i.PK }
  })
  /* console.log(`==== Example results ====`);
  const indexesToLog = selectRandom(resultsWithoutDuplicates.length);
  for (let i of indexesToLog) {
    console.log(resultsWithoutDuplicates[i]);
  }
  console.log(`^^^^ Example results ^^^^`); */
  let items = Object.values(lTable)
  const itemCount = items.length;
  if (itemCount > 99) {
    items.sort(() => Math.random() - 0.5);
    items = items.slice(0, 99);
  }
  logTable(items)
  if (itemCount > 99)
    console.log(`Too many items to log: ${itemCount}, showing random 99`);

}
main();