import * as fs from "fs";
import protocols, { Protocol } from "../protocols/data";
import { PromisePool } from '@supercharge/promise-pool'
import * as sdk from '@defillama/sdk'
import { hourlyTvl, getLastRecord } from "../utils/getLastRecord";
import { importAdapter } from "../utils/imports/importAdapter";

const cacheFile = '../../protocolRunInfo.json'

async function cacheProtocolData() {

  let actions = [protocols].flat()
  const res: any = []
  let i = 0
  let timeTaken = 0
  const startTimeAll = Date.now() / 1e3
  console.log('tvl adapter count:', actions.length)
  await PromisePool
    .withConcurrency(84)
    .for(actions)
    .process(async (protocol: any) => {
      const startTime = +Date.now()
      const adapterModule = importAdapter(protocol)
      if (protocol.module === 'dummy.js' || protocol.rugged || adapterModule.deadFrom) {
        i++
        protocol.skipped = true
        res.push(protocol)
        return false;
      }
      const item = await getLastRecord(hourlyTvl(protocol.id))
      protocol.record = item
      res.push(protocol)
      const timeTakenI = (+Date.now() - startTime) / 1e3
      timeTaken += timeTakenI
      const avgTimeTaken = timeTaken / ++i
      console.log(`Done: ${i} / ${actions.length} | protocol: ${protocol?.name} | runtime: ${timeTakenI.toFixed(2)}s | avg: ${avgTimeTaken.toFixed(2)}s | overall: ${(Date.now() / 1e3 - startTimeAll).toFixed(2)}s`)
    })
  console.log(`All Done: overall: ${(Date.now() / 1e3 - startTimeAll).toFixed(2)}s`)
  fs.writeFileSync(cacheFile, JSON.stringify(res))
  return res
}

async function test() {
  protocols.forEach((e: any, idx: number) => e.isRecent = protocols.length - idx < 420)
  const stats = {
    totalProtocol: protocols.length,
    skipped: 0,
    zero_tvl: 0,
    tvl_under_10k: 0,
    tvl_under_50k: 0,
    tvl_under_100k: 0,
    tvl_under_1M: 0,
    tvl_over_1M: 0,
    noTvlRecord: 0,
    recent_tvl_under_10k: 0,
    recent_tvl_under_50k: 0,
    recent_tvl_under_100k: 0,
    recent_tvl_under_1M: 0,
  }
  let res: any
  try {
    res = JSON.parse(fs.readFileSync(cacheFile).toString())
  } catch (e) {
    res = await cacheProtocolData()
  }
  const resIds: any = {}
  res.forEach((i: any) => resIds[i.id] = i)
  function updateProtocol(protocol: any) {
    protocol.record = resIds[protocol.id]?.record
    protocol.skipped = resIds[protocol.id]?.skipped
    if (!protocol.record) {
      stats.noTvlRecord++
      console.log(stats.noTvlRecord, '[no record]', protocol.id, protocol.name)
    }
  }


  let tvlHistkeys = ['tvl', 'tvlPrev1Hour', 'tvlPrev1Day', 'tvlPrev1Week']
  let tvlNowKeys = ['tvl', 'staking', 'pool2']
  const getMax = (({ record: i }: any, keys = tvlHistkeys) => Math.max(...keys.map(k => i[k] ?? 0)))
  let i = 0
  await PromisePool
    .withConcurrency(84)
    .for(protocols)
    .process(getProtocolStat)
  console.table(stats)


  async function getProtocolStat(protocol: any) {
    updateProtocol(protocol)

    if (protocol.skipped) {
      stats.skipped++
      return;
    }
    if (!(protocol as any).record) return;
    if (getMax(protocol) === 0) stats.zero_tvl++
    if (getMax(protocol) < 1e4) stats.tvl_under_10k++
    if (getMax(protocol) < 1e5) stats.tvl_under_100k++
    if (getMax(protocol) < 1e4 * 5) stats.tvl_under_50k++
    if (getMax(protocol) < 1e6) stats.tvl_under_1M++
    if (getMax(protocol) > 1e6) stats.tvl_over_1M++
    if (getMax(protocol) < 1e4 * 5 && protocol.isRecent) stats.recent_tvl_under_50k++
    if (getMax(protocol) < 1e4 && protocol.isRecent) stats.recent_tvl_under_10k++
    if (getMax(protocol) < 1e5 && protocol.isRecent) stats.recent_tvl_under_100k++
    if (getMax(protocol) < 1e6 && protocol.isRecent) stats.recent_tvl_under_1M++
    if (++i % 100 === 0) console.log('[processed]', i, protocol.name, protocol.id)
  }
}

test().catch((e) => {
  console.error(e)
  process.exit(1)
}).then(() => {
  process.exit(0)
})

