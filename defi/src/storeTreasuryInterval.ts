import { wrapScheduledLambda } from "./utils/shared/wrap";
import { storeTvl } from "./storeTvlInterval/getAndStoreTvl";
import { getCurrentBlock } from "./storeTvlInterval/blocks";
import { importAdapter } from "./utils/imports/importAdapter";
import { executeAndIgnoreErrors } from "./storeTvlInterval/errorDb";
import { getCurrentUnixTimestamp } from "./utils/date";
import { storeStaleCoins, StaleCoins } from "./storeTvlInterval/staleCoins";
import { PromisePool } from "@supercharge/promise-pool";
import setEnvSecrets from "./utils/shared/setEnvSecrets";
import { treasuriesAndEntities } from "./protocols/entities";

const maxRetries = 4;
const millisecondsBeforeLambdaEnd = 30e3; // 30s

const handler = async (event: any, context: AWSLambda.Context) => {
  await storeIntervals(event.protocolIndexes, context.getRemainingTimeInMillis);
};

export default wrapScheduledLambda(handler);

async function storeIntervals(protocolIndexes: number[], getRemainingTimeInMillis: () => number) {
  const blocksTimeout = setTimeout(
    () => executeAndIgnoreErrors("INSERT INTO `timeouts` VALUES (?, ?)", [getCurrentUnixTimestamp(), "blocks"]),
    getRemainingTimeInMillis() - millisecondsBeforeLambdaEnd
  );
  clearTimeout(blocksTimeout);
  await setEnvSecrets()

  const staleCoins: StaleCoins = {};
  const actions = protocolIndexes.map((idx) => treasuriesAndEntities[idx]);

  await PromisePool.withConcurrency(16)
    .for(actions)
    .process(async (protocol: any) => {
      const protocolTimeout = setTimeout(
        () =>
          executeAndIgnoreErrors("INSERT INTO `timeouts` VALUES (?, ?)", [getCurrentUnixTimestamp(), protocol.name]),
        getRemainingTimeInMillis() - millisecondsBeforeLambdaEnd
      );
      const adapterModule = importAdapter(protocol);
      const { timestamp, ethereumBlock, chainBlocks } = await getCurrentBlock(adapterModule);

      await storeTvl(
        timestamp,
        ethereumBlock,
        chainBlocks,
        protocol,
        adapterModule,
        staleCoins,
        maxRetries,
      );
      return clearTimeout(protocolTimeout);
    });

  await storeStaleCoins(staleCoins);
}
