require("dotenv").config();
import {
  batchWriteWithAlerts,
  batchWrite2WithAlerts,
} from "../adapters/utils/database";
import { filterWritesWithLowConfidence } from "../adapters/utils/database";
import { sendMessage } from "../../../defi/src/utils/discord";
import { withTimeout } from "../../../defi/src/utils/shared/withTimeout";
import adapters from "../adapters/index";
import { PromisePool } from "@supercharge/promise-pool";

function shuffleArray(array: number[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

const step = 2000;
const timeout = process.env.LLAMA_RUN_LOCAL ? 8400000 : 1740000; //29mins

async function storeDefiCoins() {
  const adaptersArray = Object.entries(adapters);
  const protocolIndexes: number[] = Array.from(
    Array(adaptersArray.length).keys(),
  );
  shuffleArray(protocolIndexes);
  const a = Object.entries(adapters);
  const timestamp = 0;
  await PromisePool.withConcurrency(5)
    .for(protocolIndexes)
    .process(async (i) => {
      const adapterKey = a[i][0];
      const timeKey = `                                                                                  --- Runtime ${adapterKey} `
      console.time(timeKey)
      try {
        const adapterFn = typeof a[i][1] === 'function' ? a[i][1] : a[i][1][adapterKey];
        const results = await withTimeout(timeout, adapterFn(timestamp));
        const resultsWithoutDuplicates = await filterWritesWithLowConfidence(
          results.flat().filter((c: any) => c.symbol != null || c.SK != 0),
        );
        for (let i = 0; i < resultsWithoutDuplicates.length; i += step) {
          await Promise.all([
            batchWriteWithAlerts(
              resultsWithoutDuplicates.slice(i, i + step),
              true,
            ),
          ]);
          await batchWrite2WithAlerts(
            resultsWithoutDuplicates.slice(i, i + step),
          );
        }
      } catch (e) {
        console.error(`ERROR: ${adapterKey} adapter failed ${e}`);
        if ((e as any).stack) {
          const lines = (e as any).stack.split('\n');
          const firstThreeLines = lines.slice(0, 3).join('\n');
          console.error(firstThreeLines);
        }
        // console.error(`${adapterKey} adapter failed ${process.env.LLAMA_RUN_LOCAL ? "" : `:${e}`}`);
        // if (!process.env.LLAMA_RUN_LOCAL)
        //   await sendMessage(
        //     `${a[i][0]} adapter failed: ${e}`,
        //     process.env.STALE_COINS_ADAPTERS_WEBHOOK!,
        //     true,
        //   );
      }
      console.timeEnd(timeKey)
    });
  console.log("All done");
  process.exit();
}
storeDefiCoins();
// ts-node coins/src/scripts/defiCoins.ts
