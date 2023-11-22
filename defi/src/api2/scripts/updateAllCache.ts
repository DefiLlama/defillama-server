import protocols from "../../protocols/data";
import entities from "../../protocols/entities";
import treasuries from "../../protocols/treasury";
import { shuffleArray } from "../../utils/shared/shuffleArray";
import { deleteFromPGCache, initializeTVLCacheDB } from "../db";
import craftProtocolV2 from "../utils/craftProtocolV2";
import PromisePool from "@supercharge/promise-pool";

async function updateAllCache() {
  await initializeTVLCacheDB({ isApi2Server: true });

  let actions = [protocols, entities, treasuries].flat()
  shuffleArray(actions) // randomize order of execution
  await PromisePool
    .withConcurrency(100)
    .for(actions)
    .process(updateProtocolCache);
}

async function updateProtocolCache(protocolData: any) {
  await deleteFromPGCache(protocolData.id) // clear postgres cache before fetching
  await craftProtocolV2({ protocolData, useNewChainNames: true, useHourlyData: false, skipAggregatedTvl: true, })
}

updateAllCache().then(() => {
  console.log('Done!!!')
  process.exit(0)
})
