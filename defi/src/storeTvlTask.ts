
import { storeTvl } from "./storeTvlInterval/getAndStoreTvl";
import { getCurrentBlock } from "./storeTvlInterval/blocks";
import protocols, { Protocol } from "./protocols/data";
import entities from "./protocols/entities";
import treasuries from "./protocols/treasury";
import { storeStaleCoins, StaleCoins } from "./storeTvlInterval/staleCoins";
import { PromisePool } from '@supercharge/promise-pool'
import { getCurrentBlocks } from "@defillama/sdk/build/computeTVL/blocks";
import * as sdk from '@defillama/sdk'
import { clearPriceCache } from "./storeTvlInterval/computeTVL";

const maxRetries = 3;

async function main() {

  const staleCoins: StaleCoins = {};
  let actions = [protocols, entities, treasuries].flat()
  // const actions = [entities, treasuries].flat()
  shuffleArray(actions) // randomize order of execution
  // actions = actions.slice(0, 301) 
  await cacheCurrentBlocks() // cache current blocks for all chains - reduce #getBlock calls
  await initializeSdkInternalCache() // initialize sdk cache - this will cache abi call responses and reduce the number of calls to the blockchain
  let i = 0
  let timeTaken = 0
  const startTimeAll = Date.now() / 1e3
  sdk.log('tvl adapter count:', actions.length)
  const alwaysRun = (_adapterModule: any) => true
  const nonTronModules = (adapterModule: any) => !adapterModule.tron
  const tronModules = (adapterModule: any) => adapterModule.tron

  const runProcess = (filter = alwaysRun) => async (protocol: any) => {
    const startTime = +Date.now()
    try {
      const adapterModule = importAdapter(protocol)
      if (!filter(adapterModule)) {
        return;
      }
      const { timestamp, ethereumBlock, chainBlocks } = await getCurrentBlock(adapterModule);
      await rejectAfterXMinutes(() => storeTvl(
        timestamp,
        ethereumBlock,
        chainBlocks,
        protocol,
        adapterModule,
        staleCoins,
        maxRetries,
      ))
    } catch (e) { console.error(e) }
    const timeTakenI = (+Date.now() - startTime) / 1e3
    timeTaken += timeTakenI
    const avgTimeTaken = timeTaken / ++i
    sdk.log(`Done: ${i} / ${actions.length} | protocol: ${protocol?.name} | runtime: ${timeTakenI.toFixed(2)}s | avg: ${avgTimeTaken.toFixed(2)}s | overall: ${(Date.now() / 1e3 - startTimeAll).toFixed(2)}s`)
  }

  const normalAdapterRuns = PromisePool
    .withConcurrency(+(process.env.STORE_TVL_TASK_CONCURRENCY ?? 15))
    .for(actions)
    .process(runProcess(alwaysRun))

  await normalAdapterRuns
  clearPriceCache()

  // const tronAdapterRuns = PromisePool
  //   .withConcurrency(2)
  //   .for(actions)
  //   .process(runProcess(tronModules))
  // await tronAdapterRuns

  // await Promise.all([normalAdapterRuns, tronAdapterRuns,])

  sdk.log(`All Done: overall: ${(Date.now() / 1e3 - startTimeAll).toFixed(2)}s`)

  await saveSdkInternalCache() // save sdk cache to r2
  await storeStaleCoins(staleCoins)
}


function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function cacheCurrentBlocks() {
  try {
    await getCurrentBlocks(['ethereum', "avax", "bsc", "polygon", "xdai", "fantom", "arbitrum", 'optimism', 'kava', 'era', 'base', 'harmony', 'moonriver', 'moonbeam', 'celo', 'heco', 'klaytn', 'metis', 'polygon_zkevm', 'linea', 'dogechain'])
    sdk.log('Cached current blocks ')
  } catch (e) { }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
}).then(() => {
  sdk.log('Exitting now...')
  process.exit(0)
})

function importAdapter(protocol: Protocol) {
  return require("@defillama/adapters/projects/" + [protocol.module])
}

async function rejectAfterXMinutes(promiseFn: any, minutes = 5) {
  const ms = minutes * 60 * 1e3
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      clearTimeout(timeoutId)
      sdk.log('Promise timed out!')
      reject(new Error('Promise timed out'))
    }, ms)

    promiseFn().then((result: any) => {
      clearTimeout(timeoutId)
      resolve(result)
    }).catch((error: any) => {
      clearTimeout(timeoutId)
      reject(error)
    })
  })
}

const INTERNAL_CACHE_FILE = 'tvl-adapter-cache/sdk-cache.json'

async function initializeSdkInternalCache() {
  let currentCache = await sdk.cache.readCache(INTERNAL_CACHE_FILE)
  sdk.log('cache size:', JSON.stringify(currentCache).length, 'chains:', Object.keys(currentCache))
  const ONE_WEEK = 60 * 60 * 24 * 7
  if (!currentCache || !currentCache.startTime || (Date.now() / 1000 - currentCache.startTime > ONE_WEEK)) {
    currentCache = {
      startTime: Math.round(Date.now() / 1000),
    }
    await sdk.cache.writeCache(INTERNAL_CACHE_FILE, currentCache)
  }
  sdk.sdkCache.startCache(currentCache)
}


async function saveSdkInternalCache() {
  await sdk.cache.writeCache(INTERNAL_CACHE_FILE, sdk.sdkCache.retriveCache())
}