import adaptersModules from "./utils/imports/adapters_liquidations";
import { performance } from "perf_hooks";
import { storeCachedLiqsR2 } from "./utils/r2";

// WARNING: This is deprecated, the feature is scraped.
const handler = async (event: any, _context: AWSLambda.Context) => {
  const protocol = event.protocol as keyof typeof adaptersModules;
  const module = adaptersModules[protocol];
  await Promise.all(
    Object.entries(module).map(async ([chain, liquidationsFunc]: [string, any]) => {
      try {
        const _start = performance.now();
        console.log(`Fetching ${protocol} data for ${chain}`);
        const liquidations = await liquidationsFunc.liquidations();
        await storeCachedLiqsR2(protocol, chain, JSON.stringify(liquidations));
        const _end = performance.now();
        console.log(`Fetched ${protocol} data for ${chain} in ${((_end - _start) / 1000).toLocaleString()}s`);
      } catch (e) {
        console.error(e);
      }
    })
  );
};

export default handler;
