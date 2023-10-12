import { storeTvl } from "./getAndStoreTvl";
import { getCurrentBlock } from "./blocks";
import protocols from "../protocols/data";
import { importAdapter } from "../utils/imports/importAdapter";
import { executeAndIgnoreErrors } from "./errorDb";
import { getCurrentUnixTimestamp } from "../utils/date";
import { storeStaleCoins, StaleCoins } from "./staleCoins";
import { PromisePool } from '@supercharge/promise-pool'
import setEnvSecrets from "../utils/shared/setEnvSecrets";
import { initializeTVLCacheDB } from "../api2/db";

const maxRetries = 4;
const millisecondsBeforeLambdaEnd = 30e3; // 30s

export default async (protocolIndexes: number[], getRemainingTimeInMillis: () => number) => {
  const blocksTimeout = setTimeout(() =>
    executeAndIgnoreErrors('INSERT INTO `timeouts` VALUES (?, ?)', [getCurrentUnixTimestamp(), "blocks"]),
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
        executeAndIgnoreErrors('INSERT INTO `timeouts` VALUES (?, ?)', [getCurrentUnixTimestamp(), protocol.name]),
        getRemainingTimeInMillis() - millisecondsBeforeLambdaEnd)
      const adapterModule = importAdapter(protocol)
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
