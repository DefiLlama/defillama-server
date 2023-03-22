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

  const results = await protocolWrapper[protocol](0);
  const resultsWithoutDuplicates = filterWritesWithLowConfidence(
    results.flat()
  );

  const lTable: any = []
  resultsWithoutDuplicates.forEach(i => { 
    lTable[i.PK] = { price: i.price, symbol: i.symbol, decimals: i.decimals }
   })
  console.log(`==== Example results ====`);
  const indexesToLog = selectRandom(resultsWithoutDuplicates.length);
  for (let i of indexesToLog) {
    console.log(resultsWithoutDuplicates[i]);
  }
  console.log(`^^^^ Example results ^^^^`);
  logTable(Object.values(lTable))
}
main();
