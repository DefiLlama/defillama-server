import { initializeTVLCacheDB } from "../db";
import { getAllItemsAfter } from "../../adaptors/db-utils/db2";
import { protocolsById } from "../../protocols/data";

const tsOneWeekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60

let data: any

export async function getDimProtocolsChainMetricsMismatch() {
  if (!data) data = _getDimProtocolsChainMetricsMismatch()
  return data;
}

async function _getDimProtocolsChainMetricsMismatch() {
  await initializeTVLCacheDB();
  const data = await getAllItemsAfter({ timestamp: tsOneWeekAgo, } as any)
  console.log('fetched records length:', data.length)
  const missingMetrics: any = {}

  data.forEach((item: any) => {
    const { data: itemData, id, timeS, } = item
    const chainsSet: any = new Set()
    Object.entries(itemData.aggregated).forEach(([metric, { chains }]: any) => {
      if (metric.startsWith('t')) return;  // skip total fields
      Object.keys(chains).forEach((chain: any) => chainsSet.add(chain))
    })
    const allChainsPresent = Array.from(chainsSet)
    Object.entries(itemData.aggregated).forEach(([metric, { chains }]: any) => {
      if (metric.startsWith('t')) return;  // skip total fields
      allChainsPresent.forEach((chain: any) => {
        if (chains.hasOwnProperty(chain)) return;
        if (!missingMetrics[id]) missingMetrics[id] = {}
        if (!missingMetrics[id][metric]) missingMetrics[id][metric] = { chains: new Set(), count: 0 }
        missingMetrics[id][metric].chains.add(chain)
        missingMetrics[id][metric].count += 1
      })
    })
  })



  const response = Object.entries(missingMetrics).map(([id, metrics]: any) => {
    const response: any = {
      metrics: [],
      chains: new Set(),
      count: 0,
    }
    Object.entries(metrics).forEach(([metric, { chains, count }]: any) => {
      response.metrics.push(metric)
      Array.from(chains).forEach((chain: any) => response.chains.add(chain))
      response.count += count
    })
    return {
      id,
      name: protocolsById[id]?.name,
      missingMetrics: response.metrics,
      chains: Array.from(response.chains),
      count: response.count,
      metadata: protocolsById[id],
    }
  })
  response.sort((a: any, b: any) => b.count - a.count)
  return response
}

if (!process.env.IS_NOT_SCRIPT_MODE)
  getDimProtocolsChainMetricsMismatch().then(data => {
    data.forEach((item: any) => delete item.metadata)
    console.table(data)
  }).catch(console.error).then(() => {
    console.log("Done");
    process.exit(0);
  })