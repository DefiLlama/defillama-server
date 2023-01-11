import adaptersModules from "./utils/imports/adapters_liquidations";
import { performance } from "perf_hooks";
import { storeCachedLiqs } from "./utils/s3";
import { storeCachedLiqsR2 } from "./utils/r2";

const handler = async (event: any, _context: AWSLambda.Context) => {
  const protocol = event.protocol as keyof typeof adaptersModules;
  const module = adaptersModules[protocol];
  await Promise.all(
    Object.entries(module).map(async ([chain, liquidationsFunc]: [string, any]) => {
      try {
        const _start = performance.now();
        console.log(`Fetching ${protocol} data for ${chain}`);
        const liquidations = await liquidationsFunc.liquidations();
        await storeCachedLiqs(protocol, chain, JSON.stringify(liquidations));
        try {
          await storeCachedLiqsR2(protocol, chain, JSON.stringify(liquidations));
        } catch (e) {
          console.error(e);
        }
        const _end = performance.now();
        console.log(`Fetched ${protocol} data for ${chain} in ${((_end - _start) / 1000).toLocaleString()}s`);
      } catch (e) {
        console.error(e);
      }
    })
  );
};

export default handler;
