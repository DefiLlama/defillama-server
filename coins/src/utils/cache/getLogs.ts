
import * as sdk from '@defillama/sdk'
import * as ethers from 'ethers'
import { getCache, setCache } from './index'
import getBlock from './../../adapters/utils/block'

const cacheFolder = 'logs'

export interface logOptions {
  api?: sdk.ChainApi;
  chain?: string;
  topic?: string;
  keys?: any;
  topics?: any;
  eventAbi?: any;
  onlyArgs?: boolean;
  target: string;
  timestamp?: number;
  toBlock?: number;
  fromBlock: number;
}

export async function getLogs(options: logOptions) {
  let { chain = 'ethereum', target,
    topic, keys = [], fromBlock, toBlock, topics,
    timestamp, api, eventAbi, onlyArgs } = options

  if (api) {
    if (api.chain) chain = api.chain
    if (api.block) toBlock = api.block as number
    if (api.timestamp) timestamp = api.timestamp
  }

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

  if (!eventAbi) return cache.logs

  return cache.logs.map((log: any) => {
    const iface = new ethers.utils.Interface([eventAbi])
    const res = iface.parseLog(log)
    if (onlyArgs) return res.args
    // res.topics = log.topics.map(i => `0x${i.slice(26)}`)
    return res
  })

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
