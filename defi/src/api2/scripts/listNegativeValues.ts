import '../utils/failOnError'

import loadAdaptorsData from "../../adaptors/data"
import { getDimensionsCacheV2, } from "../utils/dimensionsUtils";

import { RUN_TYPE, } from "../utils";
import { ADAPTER_TYPES } from '../../adaptors/handlers/triggerStoreAdaptorData';

function iterateAndGetNegativeValueInfo(info: any, negativeData: any[] = [], key = '') {
  if (typeof info === 'object') {
    for (const [k, v] of Object.entries(info ?? {})) {
      if (typeof v === 'object') {
        iterateAndGetNegativeValueInfo(v, negativeData, `${key}-${k}`)
      } else {
        if (+(v as any) < 0) {
          negativeData.push({ key: `${key}-${k}`, value: v })
        }
      }
    }
  } else {
    if (info < 0) {
      negativeData.push({ key, value: info })
    }
  }
  return negativeData
}

async function run() {
  const overallStats = [] as any
  // Go over all types
  const allCache = await getDimensionsCacheV2(RUN_TYPE.CRON)
  for (const adapterType of ADAPTER_TYPES) {
  // for (const adapterType of ['bridge-aggregators']) {
    const { protocolMap } = loadAdaptorsData(adapterType)
    const adapterTypeData = allCache[adapterType]
    const protocolIds = Object.keys(adapterTypeData.protocols ?? {})
    for (const protocolId of protocolIds) {
      const { name, category, } = protocolMap[protocolId] ?? {}
      const protocolData = adapterTypeData.protocols[protocolId]?.records
      const negativeData = [] as any
      let negativeCount = 0
      Object.entries(protocolData).forEach(([timeS, record]: any) => {
        let previousCount = negativeData.length
        iterateAndGetNegativeValueInfo(record, negativeData, timeS)
        if (negativeData.length > previousCount) negativeCount++
          
      })
      if (negativeData.length) {
        console.log('----------------------------\n\n')
        console.log(adapterType, protocolId, name, category, negativeCount)
        overallStats.push({ adapterType, protocolId, name, category, negativeCount })
        console.table(negativeData)
        console.log('\n\n----------------------------\n\n')
      }
    }
  }

  console.log('Overall stats:')
  console.table(overallStats)
}


run()
  .catch(console.error)
  .then(() => process.exit(0))
