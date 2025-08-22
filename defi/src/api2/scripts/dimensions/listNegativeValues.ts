import '../../utils/failOnError'

import loadAdaptorsData from "../../../adaptors/data"
import { getDimensionsCacheV2, } from "../../utils/dimensionsUtils";

import { RUN_TYPE, } from "../../utils";
import * as fs from 'fs'
import path from 'path';
import { ADAPTER_TYPES } from '../../../adaptors/data/types';

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
  const protocolDataMap = {} as any
  // Go over all types
  const allCache = await getDimensionsCacheV2(RUN_TYPE.CRON)
  for (const adapterType of ADAPTER_TYPES) {
  // for (const adapterType of ['bridge-aggregators']) {
    const { protocolMap } = loadAdaptorsData(adapterType)
    const adapterTypeData = allCache[adapterType]
    const protocolIds = Object.keys(adapterTypeData.protocols ?? {})
    for (const protocolId of protocolIds) {
      const { name, category, _stat_allowNegative } = (protocolMap[protocolId] ?? {}) as any
      if (_stat_allowNegative) continue;
      const protocolData = adapterTypeData.protocols[protocolId]?.records
      const negativeData = [] as any
      let negativeCount = 0
      Object.entries(protocolData).forEach(([timeS, record]: any) => {
        let previousCount = negativeData.length
        iterateAndGetNegativeValueInfo(record, negativeData, timeS)
        if (negativeData.length > previousCount) {
          negativeCount++
          if (!protocolDataMap[adapterType]) protocolDataMap[adapterType] = {}
          if (!protocolDataMap[adapterType][protocolId]) protocolDataMap[adapterType][protocolId] = { name, category, badRecords: {} }
          protocolDataMap[adapterType][protocolId].badRecords[timeS] = record
        }
          
      })
      if (negativeData.length) {
        console.log('----------------------------\n\n')
        console.log(adapterType, protocolId, name, category, negativeCount)
        overallStats.push({ adapterType, protocolId, name, category, negativeCount, allowNegative: _stat_allowNegative })
        console.table(negativeData)
        console.log('\n\n----------------------------\n\n')
      }
    }
  }

  console.log('Overall stats:')
  console.table(overallStats)
  const fileName = `negativeValues-${new Date().toISOString().split('T')[0]}-${Math.floor(Math.random() * 10000)}.log`
  console.log('Saving to file:', fileName)
  fs.writeFileSync(path.join(__dirname, fileName), JSON.stringify(protocolDataMap, null, 2))
}


run()
  .catch(console.error)
  .then(() => process.exit(0))
