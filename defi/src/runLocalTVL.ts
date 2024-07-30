
import { storeTvl } from "./storeTvlInterval/getAndStoreTvl";
import { getCurrentBlock } from "./storeTvlInterval/blocks";
import protocols, { Protocol } from "./protocols/data";
import entities from "./protocols/entities";
import treasuries from "./protocols/treasury";
import { storeStaleCoins, StaleCoins } from "./storeTvlInterval/staleCoins";
import { PromisePool } from '@supercharge/promise-pool'
import { getCurrentBlocks } from "@defillama/sdk/build/computeTVL/blocks";
import * as sdk from '@defillama/sdk'
import { shuffleArray } from "./utils/shared/shuffleArray";
import { importAdapterDynamic } from "./utils/imports/importAdapter";

const maxRetries = 1;

async function main() {

  const staleCoins: StaleCoins = {};
  const actions = [protocols, entities, treasuries].flat()
  // const actions = [entities, treasuries].flat()
  shuffleArray(actions) // randomize order of execution
  console.log('TRON', process.env.TRON_RPC)
  await cacheCurrentBlocks()
  let i = 0
  let timeTaken = 0
  const startTimeAll = Date.now() / 1e3
  sdk.log('tvl adapter count:', actions.length)

  await PromisePool
    .withConcurrency(2)
    .for(actions)
    .process(async (protocol: any) => {
      const startTime = +Date.now()
      try {
        const adapterModule: any = importAdapterDynamic(protocol)
        if (!adapterModule.tron) {
          i++
          return;
        }
        sdk.log('Attempting: ', protocol.name)
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
    })

  sdk.log(`All Done: overall: ${(Date.now() / 1e3 - startTimeAll).toFixed(2)}s`)

  await storeStaleCoins(staleCoins)
}

async function cacheCurrentBlocks() {
  try {
    await getCurrentBlocks(['ethereum', "avax", "bsc", "polygon", "xdai", "fantom", "arbitrum", 'optimism', 'kava', 'era', 'base', 'harmony', 'moonriver', 'moonbeam', 'celo', 'heco', 'kaia', 'metis', 'polygon_zkevm', 'linea', 'dogechain'])
    sdk.log('Cached current blocks ')
  } catch (e) { }
}

main().then(() => {
  sdk.log('Exitting now...')
  process.exit(0)
})

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