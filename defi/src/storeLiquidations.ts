import { wrapScheduledLambda } from "./utils/shared/wrap";
import adaptersModules from "./utils/imports/adapters_liquidations";
import { getCurrentUnixTimestamp } from "./utils/date";
import { getCachedLiqsR2, getExternalLiqsR2, storeCachedLiqsR2, storeLiqsR2 } from "./utils/r2";
import { aggregateAssetAdapterData, Liq } from "./liquidationsUtils";
import { performance } from "perf_hooks";
import setEnvSecrets from "./utils/shared/setEnvSecrets";

export const standaloneProtocols: string[] = ["venus", "maker"];
export const excludedProtocols: string[] = ["angle", "euler"];

async function handler() {
  await setEnvSecrets()
  const time = getCurrentUnixTimestamp();
  const data = await Promise.all(
    Object.entries(adaptersModules)
      .filter(([protocol]) => !excludedProtocols.includes(protocol))
      .map(async ([protocol, module]) => {
        const start = performance.now();
        console.log(`Fetching ${protocol} data`);
        const liqs: { [chain: string]: Liq[] } = {};
        if (standaloneProtocols.includes(protocol)) {
          await Promise.all(
            Object.entries(module).map(async ([chain]: [string, any]) => {
              try {
                const _start = performance.now();
                console.log(`Using external fetcher for ${protocol}/${chain}`);
                const liquidations = await getExternalLiqsR2(protocol, chain);
                liqs[chain] = liquidations;
                const res = await storeCachedLiqsR2(protocol, chain, JSON.stringify(liquidations));
                console.log(res?.$metadata?.httpStatusCode);
                const _end = performance.now();
                console.log(`Fetched ${protocol} data for ${chain} in ${((_end - _start) / 1000).toLocaleString()}s`);
              } catch (e) {
                console.error(e);
                try {
                  liqs[chain] = JSON.parse((await getCachedLiqsR2(protocol, chain))!);
                  console.log(`Using cached data for ${protocol}/${chain}`);
                } catch (e) {
                  console.log(`No external fetcher data for ${protocol}/${chain}`);
                }
              }
            })
          );
        } else {
          await Promise.all(
            Object.entries(module).map(async ([chain, liquidationsFunc]: [string, any]) => {
              try {
                const _start = performance.now();
                console.log(`Fetching ${protocol} data for ${chain}`);
                const liquidations = await liquidationsFunc.liquidations();
                liqs[chain] = liquidations;
                await storeCachedLiqsR2(protocol, chain, JSON.stringify(liquidations));
                const _end = performance.now();
                console.log(`Fetched ${protocol} data for ${chain} in ${((_end - _start) / 1000).toLocaleString()}s`);
              } catch (e) {
                console.error(e);
                try {
                  liqs[chain] = JSON.parse((await getCachedLiqsR2(protocol, chain))!);
                  console.log(`Using cached data for ${protocol}/${chain}`);
                } catch (e) {
                  console.log(`No cached data for ${protocol}/${chain}`);
                }
              }
            })
          );
        }

        const end = performance.now();
        console.log(`Fetched ${protocol} in ${((end - start) / 1000).toLocaleString()}s`);

        return {
          protocol,
          liqs,
        };
      })
  );

  const adapterData: { [protocol: string]: Liq[] } = data.reduce(
    (acc, d) => ({ ...acc, [d.protocol]: Object.values(d.liqs).flat() }),
    {}
  );

  // <symbol, {currentPrice: number; positions: Position[];}>
  const allAggregated = await aggregateAssetAdapterData(adapterData);
  const hourId = Math.floor(time / 3600 / 6) * 6;
  const availability: { [symbol: string]: number } = {};
  for (const [symbol, { currentPrice, positions }] of allAggregated) {
    availability[symbol] = positions.length;

    const _payload = {
      symbol,
      currentPrice,
      positions,
      time,
    };
    const filename = symbol.toLowerCase() + "/" + hourId + ".json";
    const resStoreLiqsR2 = await storeLiqsR2(filename, JSON.stringify(_payload));
    console.log("resStoreLiqsR2", resStoreLiqsR2?.$metadata?.httpStatusCode);
    const latestFilename = symbol.toLowerCase() + "/latest.json";
    const resStoreLiqsR2Latest = await storeLiqsR2(latestFilename, JSON.stringify(_payload));
    console.log("resStoreLiqsR2Latest", resStoreLiqsR2Latest?.$metadata?.httpStatusCode);
  }

  await storeLiqsR2("availability.json", JSON.stringify({ availability, time }));
  console.log("Done");
  return;
}

export default wrapScheduledLambda(handler);
