import protocols from "../../protocols/data";
import entities from "../../protocols/entities";
import treasuries from "../../protocols/treasury";
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

function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}