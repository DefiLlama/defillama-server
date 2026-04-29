import { prepareAtvlContext, runAtvlForTimestamp } from "./atvlRefill";
import { sendMessage } from "../utils/discord";

export default async function main(ts: number = 0) {
  const t0 = performance.now();

  const context = await prepareAtvlContext();
  console.log(`[timer] prepareAtvlContext: ${((performance.now() - t0) / 1000).toFixed(1)}s`);

  const t1 = performance.now();
  const finalData = await runAtvlForTimestamp(ts, context, { storeResults: true });
  console.log(`[timer] runAtvlForTimestamp: ${((performance.now() - t1) / 1000).toFixed(1)}s`);

  console.log(`[timer] TOTAL: ${((performance.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`Exitting atvl.ts`);
  return finalData;
}

main().catch(async (error) => {
  console.error('Error running the script: ', error);
  await sendMessage(`Error running the script: ${error}`, process.env.RWA_WEBHOOK!, false);
  process.exit(1);
}).then(() => process.exit(0)); // ts-node defi/src/rwa/atvl.ts
