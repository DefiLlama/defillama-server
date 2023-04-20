
import * as sdk from '@defillama/sdk'
import * as ethers from 'ethers'
import { getCache, setCache } from './cache'

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

  if (!api)
    api = new sdk.ChainApi({ block: toBlock, chain, timestamp })
  
  if (api.chain) chain = api.chain
  if (!toBlock) {
    toBlock = await api.getBlock()
  }
  if (api.timestamp) timestamp = api.timestamp

  if (!target) throw new Error('Missing target!')
  if (!fromBlock) throw new Error('Missing fromBlock!')
  if (!toBlock) throw new Error('Missing fromBlock!')

  target = target.toLowerCase()
  const key = `${chain}/${target}`

  let cache = await _getCache(key)
  let response

  // if no new data nees to be fetched
  if (cache.fromBlock && cache.toBlock > toBlock)  // @ts-ignore
    response = cache.logs.filter(i => i.blockNumber < toBlock && i.blockNumber >= fromBlock)
  else
    response = await fetchLogs()

  if (!eventAbi) return response

  return response.map((log: any) => {
    const iface = new ethers.utils.Interface([eventAbi])
    const res = iface.parseLog(log)
    if (onlyArgs) return res.args
    // @ts-ignore
    res.topics = log.topics.map(i => `0x${i.slice(26)}`)
    return res
  })

  async function fetchLogs() {
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
  }

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