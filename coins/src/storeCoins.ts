import adapters from "./adapters/index";
import { batchWrite } from "./utils/shared/dynamodb";
import { storePks, checkOutdated } from "./listCoins";
import { wrapScheduledLambda } from "./utils/shared/wrap";

const handler = async (event: any) => {
  const a = Object.entries(adapters);
  const timestamp = 0;
  await Promise.all(
    event.protocolIndexes.map(async (i: any) => {
      try {
        const results: any[] = await a[i][1][a[i][0]](timestamp);
        await batchWrite(results.flat(), true);
      } catch (e) {
        console.log("adapter failed", a[i][0], e);
      }
    })
  );
}; // ts-node coins/src/storeCoins.ts

export default wrapScheduledLambda(handler);
