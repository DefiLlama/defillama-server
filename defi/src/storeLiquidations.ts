import fetch from "node-fetch";
import { wrapScheduledLambda } from "./utils/shared/wrap";
import adaptersModules from "./utils/imports/adapters_liquidations";
import { getCurrentUnixTimestamp } from "./utils/date";
import { storeLiqs } from "./utils/s3";
import { aggregateAssetAdapterData, Liq } from "./liquidationsUtils";
import { performance } from "perf_hooks";

async function handler() {
  const time = getCurrentUnixTimestamp();
  const data = await Promise.all(
    Object.entries(adaptersModules).map(async ([protocol, module]) => {
      const start = performance.now();
      console.log(`Fetching ${protocol} data`);
      const liqs: { [chain: string]: Liq[] } = {};
      await Promise.all(
        Object.entries(module).map(async ([chain, liquidationsFunc]: [string, any]) => {
          try {
            const _start = performance.now();
            console.log(`Fetching ${protocol} data for ${chain}`);
            const liquidations = await liquidationsFunc.liquidations();
            liqs[chain] = liquidations;
            const _end = performance.now();
            console.log(`Fetched ${protocol} data for ${chain} in ${((_end - _start) / 1000).toLocaleString()}s`);
          } catch (e) {
            console.error(e);
          }
        })
      );
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
    await storeLiqs(filename, JSON.stringify(_payload));
    const latestFilename = symbol.toLowerCase() + "/latest.json";
    await storeLiqs(latestFilename, JSON.stringify(_payload));
  }

  await storeLiqs("availability.json", JSON.stringify({ availability, time }));

  // revalidate the liquidations pages after the data is updated
  await Promise.all(LIQUIDATIONS_PATHS.map(forceRevalidate));

  return;
}

const forceRevalidate = async (path: string) => {
  try {
    const { revalidated } = await fetch(
      `https://defillama.com/api/revalidate?${new URLSearchParams({
        secret: process.env.REVALIDATE_SECRET!,
        path,
      })}`,
      { method: "GET" }
    ).then((r) => r.json() as Promise<{ revalidated: boolean }>);
    return revalidated;
  } catch (e) {
    console.error(e);
    return undefined;
  }
};

const LIQUIDATIONS_PATHS = [
  "ETH",
  "WBTC",
  "DAI",
  "SOL",
  "USDC",
  "WSTETH",
  "STSOL",
  "MSOL",
  "USDT",
  "YFI",
  "FTT",
  "COMP",
  "UNI",
  "BAT",
  "CRV",
  "LINK",
  "TUSD",
  "AAVE",
  "MKR",
  "AVAX",
  "MATIC",
  "SUSHI",
  "SNX",
  "JOE",
  "MIM",
  "ZRX",
  "ENJ",
  "MANA",
  "1INCH",
  "REN",
].map((x) => `/liquidations/${x.toLowerCase()}`);

export default wrapScheduledLambda(handler);
