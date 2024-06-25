import { storeTvl } from "./storeTvlInterval/getAndStoreTvl";
import { getCurrentBlock } from "./storeTvlInterval/blocks";
import protocols from "./protocols/data";
import entities from "./protocols/entities";
import treasuries from "./protocols/treasury";
import { storeStaleCoins, StaleCoins } from "./storeTvlInterval/staleCoins";
import { PromisePool } from '@supercharge/promise-pool'
import * as sdk from '@defillama/sdk'
import { clearPriceCache } from "./storeTvlInterval/computeTVL";
import { hourlyTvl, } from "./utils/getLastRecord";
import { closeConnection, getLatestProtocolItem, initializeTVLCacheDB } from "./api2/db";
import { shuffleArray } from "./utils/shared/shuffleArray";
import { importAdapterDynamic } from "./utils/imports/importAdapter";
import { elastic } from '@defillama/sdk';
import { getUnixTimeNow } from "./api2/utils/time";

const maxRetries = 2;

const INTERNAL_CACHE_FILE = 'tvl-adapter-cache/sdk-cache.json'

async function main() {

  const staleCoinWrites: Promise<void>[] = []
  let actions = [protocols, entities, treasuries].flat()
  // const actions = [entities, treasuries].flat()
  shuffleArray(actions) // randomize order of execution
  // actions = actions.slice(0, 301) 
  entities.forEach((e: any) => e.isEntity = true)
  treasuries.forEach((e: any) => e.isTreasury = true)
  protocols.forEach((e: any, idx: number) => e.isRecent = protocols.length - idx < 220)

  // we let the adapters take care of the blocks
  // await cacheCurrentBlocks() // cache current blocks for all chains - reduce #getBlock calls
  await getCurrentBlock({ chains: [] })
  await initializeSdkInternalCache() // initialize sdk cache - this will cache abi call responses and reduce the number of calls to the blockchain
  await initializeTVLCacheDB()
  let i = 0
  let skipped = 0
  let failed = 0
  let timeTaken = 0
  const startTimeAll = Date.now() / 1e3
  sdk.log('tvl adapter count:', actions.length)
  // sdk.log('[test env] AVAX_RPC:', process.env.AVAX_RPC)
  const alwaysRun = async (_adapterModule: any, _protocol: any) => true

  const runProcess = (filter = alwaysRun) => async (protocol: any) => {
    const metadata = {
      application: 'tvl',
      type: protocol.isEntity ? 'entity' : protocol.isTreasury ? 'treasury' : 'protocol',
      name: protocol.name,
      id: protocol.id,
    } as any
    let success = true
    const startTime = getUnixTimeNow()
    try {
      const staleCoins: StaleCoins = {};
      const adapterModule = importAdapterDynamic(protocol)
      if (!(await filter(adapterModule, protocol))) {
        i++
        skipped++
        return;
      }
      // const { timestamp, ethereumBlock, chainBlocks } = await getCurrentBlock(adapterModule);
      // NOTE: we are intentionally not fetching chain blocks, in theory this makes it easier for rpc calls as we no longer need to query at a particular block

      // we are fetching current blocks but not using it because, this is to trigger check if rpc is returning stale data
      await getCurrentBlock({ adapterModule, catchOnlyStaleRPC: true, })
      const { timestamp, ethereumBlock, chainBlocks } = await getCurrentBlock({ chains: [] });
      // await rejectAfterXMinutes(() => storeTvl(timestamp, ethereumBlock, chainBlocks, protocol, adapterModule, staleCoins, maxRetries,))
      await storeTvl(timestamp, ethereumBlock, chainBlocks, protocol, adapterModule, staleCoins, maxRetries,)
      staleCoinWrites.push(storeStaleCoins(staleCoins))
    } catch (e: any) {
      console.log('FAILED: ', protocol?.name, e?.message)
      failed++

      success = false
      let errorString = e?.message
      try {
        errorString = JSON.stringify(e)
      } catch (e) { }
      await elastic.addErrorLog({
        error: e as any,
        errorString,
        metadata,
      } as any)
    }


    const timeTakenI = (getUnixTimeNow() - startTime) / 1e3

    await elastic.addRuntimeLog({
      runtime: timeTakenI,
      success,
      metadata,
    } as any)

    timeTaken += timeTakenI
    const avgTimeTaken = timeTaken / ++i
    console.log(`Done: ${i} / ${actions.length} | protocol: ${protocol?.name} | runtime: ${timeTakenI.toFixed(2)}s | avg: ${avgTimeTaken.toFixed(2)}s | overall: ${(Date.now() / 1e3 - startTimeAll).toFixed(2)}s | skipped: ${skipped} | failed: ${failed}`)
  }

  const normalAdapterRuns = PromisePool
    .withConcurrency(+(process.env.STORE_TVL_TASK_CONCURRENCY ?? 32))
    .for(actions)
    .process(runProcess(filterProtocol))

  await normalAdapterRuns
  clearPriceCache()

  sdk.log(`All Done: overall: ${(Date.now() / 1e3 - startTimeAll).toFixed(2)}s | skipped: ${skipped}`)
  await Promise.all(staleCoinWrites)
  await preExit()
}

async function preExit() {
  try {
    await saveSdkInternalCache() // save sdk cache to r2
    // await sendMessage(`storing ${Object.keys(staleCoins).length} coins`, process.env.STALE_COINS_ADAPTERS_WEBHOOK!, true);
    // await storeStaleCoins(staleCoins)
  } catch (e) {
    console.error(e)
  }
}

/* async function cacheCurrentBlocks() {
  try {
    await getCurrentBlocks(['ethereum', "avax", "bsc", "polygon", "xdai", "fantom", "arbitrum", 'optimism', 'kava', 'era', 'base', 'harmony', 'moonriver', 'moonbeam', 'celo', 'heco', 'klaytn', 'metis', 'polygon_zkevm', 'linea', 'dogechain'])
    sdk.log('Cached current blocks ')
  } catch (e) { }
} */

main().catch((e) => {
  console.error(e)
  process.exit(1)
}).then(async () => {
  sdk.log('Exitting now...')
  await closeConnection()
  process.exit(0)
})

async function rejectAfterXMinutes(promiseFn: any, minutes = 10) {
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

async function filterProtocol(adapterModule: any, protocol: any) {
  // skip running protocols that are dead/rugged or dont have tvl
  if (protocol.module === 'dummy.js' || protocol.rugged || adapterModule.deadFrom)
    return false;


  let tvlHistkeys = ['tvl', 'tvlPrev1Hour', 'tvlPrev1Day', 'tvlPrev1Week']
  // let tvlNowKeys = ['tvl', 'staking', 'pool2']
  const getMax = ((i: any, keys = tvlHistkeys) => Math.max(...keys.map(k => i[k] ?? 0)))
  const lastRecord = await getLatestProtocolItem(hourlyTvl, protocol.id)
  // for whatever reason if latest tvl record is not found, run tvl adapter
  if (!lastRecord)
    return true

  const HOUR = 60 * 60
  const MIN_WAIT_TIME = 3/4 * HOUR // 45 minutes - ideal wait time because we run every 30 minutes
  const currentTime = Math.round(Date.now() / 1000)
  const timeDiff = currentTime - lastRecord.SK
  const highestRecentTvl = getMax(lastRecord)

  if (MIN_WAIT_TIME > timeDiff) // skip as tvl was updated recently
    return false

  // always fetch tvl for recent protocols
  if (protocol.isRecent) return true

  const runLessFrequently = protocol.isEntity || protocol.isTreasury || highestRecentTvl < 200_000

  if (runLessFrequently && timeDiff < 3 * HOUR)
    return false

  return true
}

// Absolutely bad code: workaround for aws-sdk crashing with ThrottlingException
process.on('uncaughtException', (err) => {
  console.log(err.name, err.message);
  console.log('UNHANDLED EXCEPTION! Shutting down...');
})

setTimeout(async () => {
  console.log('Timeout! Shutting down...');
  preExit()
  process.exit(1);
}, 1000 * 60 * 40); // 40 minutes