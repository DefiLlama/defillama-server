import { storeTvl } from "./getAndStoreTvl";
import { getCurrentBlocks } from "./blocks";
import { getCoingeckoLock, releaseCoingeckoLock } from "../utils/shared/coingeckoLocks";
import protocols from "../protocols/data";
import { importAdapter } from "../utils/imports/importAdapter";
import { executeAndIgnoreErrors } from "./errorDb";
import { getCurrentUnixTimestamp } from "../utils/date";
import { storeStaleCoins, StaleCoins } from "./staleCoins";

const maxRetries = 4;
const millisecondsBeforeLambdaEnd = 30e3; // 30s

export default async (protocolIndexes:number[], getRemainingTimeInMillis:()=>number) => {
  const blocksTimeout = setTimeout(()=>
    executeAndIgnoreErrors('INSERT INTO `timeouts` VALUES (?, ?)', [getCurrentUnixTimestamp(), "blocks"]),
    getRemainingTimeInMillis() - millisecondsBeforeLambdaEnd)
  const { timestamp, ethereumBlock, chainBlocks } = await getCurrentBlocks();
  clearTimeout(blocksTimeout)
  
  const staleCoins: StaleCoins = {};
  const actions = protocolIndexes
    .map(idx=>protocols[idx])
    .map((protocol) =>{
      const protocolTimeout = setTimeout(()=>
        executeAndIgnoreErrors('INSERT INTO `timeouts` VALUES (?, ?)', [getCurrentUnixTimestamp(), protocol.name]),
        getRemainingTimeInMillis() - millisecondsBeforeLambdaEnd)
      const adapterModule = importAdapter(protocol)
      return storeTvl(
        timestamp,
        ethereumBlock,
        chainBlocks,
        protocol,
        adapterModule,
        staleCoins,
        maxRetries,
        getCoingeckoLock,
      ).then(()=>clearTimeout(protocolTimeout))
    });
  const timer = setInterval(() => {
    // Rate limit is 100 calls/min for coingecko's API
    // So we'll release one every 0.6 seconds to match it
    releaseCoingeckoLock();
  }, 600);
  await Promise.all(actions);
  clearInterval(timer);
  await storeStaleCoins(staleCoins)
  return;
};
