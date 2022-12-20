
import * as sdk from '@defillama/sdk'
import { getCache, setCache } from './index'
import getBlock from './../../adapters/utils/block'

const cacheFolder = 'logs'

export interface logOptions {
  chain?: string;
  topic?: string;
  keys?: any;
  topics?: any;
  target: string;
  timestamp?: number;
  toBlock?: number;
  fromBlock: number;
}

export async function getLogs(options: logOptions) {
  let { chain = 'ethereum', target,
    topic, keys = [], fromBlock, toBlock, topics,
    timestamp, } = options

  if (!target) throw new Error('Missing target!')
  if (!fromBlock) throw new Error('Missing fromBlock!')

  if (!toBlock)
    toBlock = await getBlock(chain, timestamp as any)

  target = target.toLowerCase()
  const key = `${chain}/${target}`

  let cache = await _getCache(key)

  // if no new data nees to be fetched
  if (cache.fromBlock && cache.toBlock > (toBlock as any))
    return cache.logs.filter((i: any) => i.blockNumber < (toBlock as any) && i.blockNumber >= fromBlock)

  cache.fromBlock = fromBlock
  fromBlock = cache.toBlock ?? fromBlock

  const logs = (await sdk.api.util.getLogs({
    chain, target, topic, keys, topics, fromBlock, toBlock,
  } as any)).output

  cache.logs.push(...logs)
  cache.toBlock = toBlock

  const logIndices = new Set()

  // remove possible duplicates
  cache.logs = cache.logs.filter((i: any) => {
    let key = i.transactionHash + i.logIndex
    if (!i.hasOwnProperty('logIndex') || !i.hasOwnProperty('transactionHash')) {
      sdk.log(i)
      throw new Error('Missing crucial field')
    }
    if (logIndices.has(key)) return false
    logIndices.add(key)
    return true
  })

  await setCache(cacheFolder, key, cache)

  return cache.logs

  async function _getCache(key: string) {
    let cache = await getCache(cacheFolder, key)
    // set initial structure if it is missing / reset if from block is moved to something older
    if (!cache.logs || fromBlock < cache.fromBlock) {
      cache = {
        logs: []
      }
    }

    return cache
  }
}

module.exports = {
  getLogs
}