import { wrapScheduledLambda } from "./utils/shared/wrap";
import { storeTvl } from "./storeTvlInterval/getAndStoreTvl";
import { getCurrentBlock } from "./storeTvlInterval/blocks";
import { getCoingeckoLock, releaseCoingeckoLock } from "./utils/shared/coingeckoLocks";
import { treasuries } from "./protocols/data";
import { importAdapter } from "./utils/imports/importAdapter";
import { executeAndIgnoreErrors } from "./storeTvlInterval/errorDb";
import { getCurrentUnixTimestamp } from "./utils/date";
import { storeStaleCoins, StaleCoins } from "./storeTvlInterval/staleCoins";
import { PromisePool } from "@supercharge/promise-pool";
import parentProtocols from "./protocols/parentProtocols";

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

  const staleCoins: StaleCoins = {};
  const actions = protocolIndexes.map((idx) => treasuries[idx]);

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
      const updatedProtocol = {
        ...protocol,
        name: protocol.parentProtocol
          ? parentProtocols.find((p) => p.id === protocol.parentProtocol)?.name ?? protocol.name
          : protocol.name,
      };

      console.log({ updatedProtocol });

      await storeTvl(
        timestamp,
        ethereumBlock,
        chainBlocks,
        updatedProtocol,
        adapterModule,
        staleCoins,
        maxRetries,
        getCoingeckoLock
      );
      return clearTimeout(protocolTimeout);
    });

  const timer = setInterval(() => {
    // Rate limit is 100 calls/min for coingecko's API
    // So we'll release one every 0.6 seconds to match it
    releaseCoingeckoLock();
  }, 600);
  clearInterval(timer);
  await storeStaleCoins(staleCoins);
}
