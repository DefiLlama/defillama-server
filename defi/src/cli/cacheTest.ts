require("dotenv").config();

import protocols from "../protocols/data";
import type { Protocol } from "../protocols/data";
import { importAdapter } from "./utils/importAdapter";
import { getBlocksRetry } from "../storeTvlInterval/blocks";
import * as sdk from '@defillama/sdk'
import * as fs from 'fs'
import { PromisePool } from '@supercharge/promise-pool'

const cacheFile = __dirname + '/../../../../serverCache.json'
const cache = JSON.parse(fs.readFileSync(cacheFile) as any)
sdk.cache.startCache(cache)

console.log('No. of protocols: ', protocols.length)

const startTime = getTime()
const ignoreSet = new Set(['solana', 'terra', 'terra2', 'algorand', 'eos', 'aptos', 'cardano', 'tron', 'near', 'tezos', 'mixin', 'waves', 'acala', 'neo' ])

async function run() {
  const timestamp = getTime()
  const blockRes = await getBlocksRetry(timestamp, {})
  const ethereumBlock = blockRes.ethereumBlock
  const chainBlocks = blockRes.chainBlocks
  let finished = 0
  let running = 0
  await PromisePool
    .withConcurrency(1)
    // .for(protocols.filter(i => i.name === 'Unifarm'))
    .for(protocols.slice(650))
    .process(async (protocol: Protocol, _index: number) => {
      running++
      console.log('runnnng for ', protocol.name)
      const adapterModule = await importAdapter(protocol)

      if (_index % 100 === 0) 
        fs.writeFileSync(cacheFile, JSON.stringify(cache))

      try {

        let tvlPromises = Object.entries(adapterModule).map(async ([chain, value]) => {
          if (ignoreSet.has(chain)) return;
          if (chain === "default") {
            return;
          }
          if (typeof value !== "object" || value === null) {
            return;
          }
          return Promise.all(Object.entries(value).map(async ([tvlType, tvlFunction]) => {
            if (typeof tvlFunction !== "function") {
              return
            }
            let storedKey = `${chain}-${tvlType}`
            let tvlFunctionIsFetch = false;
            if (tvlType === "tvl") {
              storedKey = chain
            } else if (tvlType === "fetch") {
              storedKey = chain
              tvlFunctionIsFetch = true
            }
            const block = chainBlocks[chain]
            const api = new sdk.ChainApi({ chain, block, timestamp, })
            await tvlFunction(timestamp, ethereumBlock, chainBlocks, { api, chain, storedKey, block })
          }))
        })
        if (adapterModule.tvl) {
          if (adapterModule.tvl) {
            const mainTvlPromise = adapterModule.tvl(timestamp, ethereumBlock, chainBlocks)
            tvlPromises = tvlPromises.concat([mainTvlPromise as Promise<any>])
          }
        }
        await Promise.all(tvlPromises)
      } catch (e) { }
      // console.log('finished for ', protocol.name)

      finished++
      running--
      console.log(`Finished ${finished}/${protocols.length} |-| currently running: ${running}  |-| Run time (mins): ${getTimeTaken()} `)
    })

}

function getTimeTaken() {
  return Number((getTime() - startTime)/60).toFixed(2)
}

function getTime() {
  return Math.round(Date.now() / 1000)
}

run().then(() => {
  console.log('Done !!!')
  console.log('time taken (mins):', getTimeTaken())
})