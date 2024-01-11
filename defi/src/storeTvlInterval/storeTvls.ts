import { storeTvl } from "./getAndStoreTvl";
import { getCurrentBlock } from "./blocks";
import protocols from "../protocols/data";
import { importAdapterDynamic } from "../utils/imports/importAdapter";
import { initializeTVLCacheDB, TABLES } from "../api2/db/index";
import { getCurrentUnixTimestamp } from "../utils/date";
import { storeStaleCoins, StaleCoins } from "./staleCoins";
import { PromisePool } from '@supercharge/promise-pool'
import setEnvSecrets from "../utils/shared/setEnvSecrets";

const maxRetries = 4;
const millisecondsBeforeLambdaEnd = 30e3; // 30s

export default async (protocolIndexes: number[], getRemainingTimeInMillis: () => number) => {
  const blocksTimeout = setTimeout(() =>
  () => TABLES.TvlMetricsTimeouts.upsert({ timestamp: getCurrentUnixTimestamp(), protocol: 'blocks' }),
    getRemainingTimeInMillis() - millisecondsBeforeLambdaEnd)
  clearTimeout(blocksTimeout)
  await setEnvSecrets()

  const staleCoins: StaleCoins = {};
  const actions = protocolIndexes.map(idx => protocols[idx])
  await initializeTVLCacheDB()

  await PromisePool
    .withConcurrency(16)
    .for(actions)
    .process(async  (protocol: any) => {
      const protocolTimeout = setTimeout(() =>
      () => TABLES.TvlMetricsTimeouts.upsert({ timestamp: getCurrentUnixTimestamp(), protocol: protocol.name }),
        getRemainingTimeInMillis() - millisecondsBeforeLambdaEnd)
      const adapterModule = importAdapterDynamic(protocol) // won't work on lambda now with esbuild
      const { timestamp, ethereumBlock, chainBlocks } = await getCurrentBlock({adapterModule, catchOnlyStaleRPC: true, });
      await storeTvl(
        timestamp,
        ethereumBlock,
        chainBlocks,
        protocol,
        adapterModule,
        staleCoins,
        maxRetries,
      )
      return clearTimeout(protocolTimeout)
    })

  
  await storeStaleCoins(staleCoins);

  return;
};
