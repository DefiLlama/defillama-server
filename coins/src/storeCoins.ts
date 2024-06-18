require("dotenv").config();
import adapters from "./adapters/index";
import {
  batchWriteWithAlerts,
  batchWrite2WithAlerts,
} from "./adapters/utils/database";
import { filterWritesWithLowConfidence } from "./adapters/utils/database";
import { sendMessage } from "./../../defi/src/utils/discord";
import { withTimeout } from "./../../defi/src/utils/shared/withTimeout";
import PromisePool from "@supercharge/promise-pool";
import setEnvSecrets from "./utils/shared/setEnvSecrets";

const step = 2000;
const timeout = process.env.LLAMA_RUN_LOCAL ? 8400000 : 840000; //14mins

export default async function handler() {
  await setEnvSecrets()
  const a = Object.entries(adapters);
  const indexes = Array.from(Array(a.length).keys());
  const timestamp = 0;
  await PromisePool.withConcurrency(5)
    .for(indexes)
    .process(async (i: any) => {
      try {
        if (
          ![
            "",
            // "uniswap",
            // "curve",
            // "curve12",
            // "sushiswap1",
            // "unknownTokens",
          ].includes(a[i][0]) &&
          !process.env.LLAMA_RUN_LOCAL
        )
          return;
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
        if (!process.env.LLAMA_RUN_LOCAL)
          await sendMessage(
            `${a[i][0]} adapter failed: ${e}`,
            process.env.STALE_COINS_ADAPTERS_WEBHOOK!,
            true,
          );
      }
    });
}

// handler(); // ts-node coins/src/storeCoins.ts
