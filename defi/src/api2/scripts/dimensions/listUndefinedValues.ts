import '../../utils/failOnError'

import loadAdaptorsData from "../../../adaptors/data"
import { getDimensionsCacheV2, } from "../../utils/dimensionsUtils";

import { RUN_TYPE, } from "../../utils";
import { ADAPTER_TYPES } from '../../../adaptors/handlers/triggerStoreAdaptorData';
import * as fs from 'fs'
import * as path from 'path'

const badWords = ['undefined', 'immutablex', 'chiliz', 'haqq', 'bitlayer', 'superposition', 'archway-1' ]

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
      const { name, category, } = (protocolMap[protocolId] ?? {}) as any
      const protocolData = adapterTypeData.protocols[protocolId]?.records
      let undefinedCount = 0
      const badwordSet = new Set()
      Object.entries(protocolData).forEach(([timeS, record]: any) => {

        const recordString = JSON.stringify(record)
        const wordsFound = badWords.filter((word) => recordString.includes(word))

        if (wordsFound.length) {
          wordsFound.forEach((word) => badwordSet.add(word))
          undefinedCount++
          if (!protocolDataMap[adapterType]) protocolDataMap[adapterType] = {}
          if (!protocolDataMap[adapterType][protocolId]) protocolDataMap[adapterType][protocolId] = { name, category, badRecords: {} }
          protocolDataMap[adapterType][protocolId].badRecords[timeS] = record
        }
          
      })
      if (undefinedCount) {
        console.log('----------------------------\n\n')
        console.log(adapterType, protocolId, name, category, undefinedCount)
        overallStats.push({ adapterType, protocolId, name, category, undefinedCount, badwordSet })
        console.log('\n\n----------------------------\n\n')
      }
    }
  }

  console.log('Overall stats:')
  console.table(overallStats)
  const fileName = `undefined-${new Date().toISOString().split('T')[0]}-${Math.floor(Math.random() * 10000)}.log`
  console.log('Saving to file:', fileName)
  fs.writeFileSync(path.join(__dirname, fileName), JSON.stringify(protocolDataMap, null, 2))
}


run()
  .catch(console.error)
  .then(() => process.exit(0))
