require("dotenv").config();
import {
  batchWriteWithAlerts,
  batchWrite2WithAlerts,
} from "../adapters/utils/database";
import { filterWritesWithLowConfidence } from "../adapters/utils/database";
import { sendMessage } from "../../../defi/src/utils/discord";
import { withTimeout } from "../../../defi/src/utils/shared/withTimeout";
import setEnvSecrets from "../../../defi/src/utils/shared/setEnvSecrets";
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
  await setEnvSecrets();
  const adaptersArray = Object.entries(adapters);
  const protocolIndexes: number[] = Array.from(
    Array(adaptersArray.length).keys(),
  );
  shuffleArray(protocolIndexes);
  const a = Object.entries(adapters);
  const timestamp = 0;
  await PromisePool.withConcurrency(1)
    .for(protocolIndexes)
    .process(async (i) => {
      try {
        const results = await withTimeout(timeout, a[i][1][a[i][0]](timestamp));
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
        console.log(`${a[i][0]} done`);
      } catch (e) {
        console.error(
          `${a[i][0]} adapter failed ${
            process.env.LLAMA_RUN_LOCAL ? "" : `:${e}`
          }`,
        );
        // if (!process.env.LLAMA_RUN_LOCAL)
        //   await sendMessage(
        //     `${a[i][0]} adapter failed: ${e}`,
        //     process.env.STALE_COINS_ADAPTERS_WEBHOOK!,
        //     true,
        //   );
      }
    });
  process.exit();
}
storeDefiCoins();
// ts-node coins/src/scripts/defiCoins.ts
