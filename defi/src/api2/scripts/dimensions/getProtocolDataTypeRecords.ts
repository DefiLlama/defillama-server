import '../../utils/failOnError'

// Protocol datatype is deprecated, this script copies all the protocol records missing in dex & fees type to them

import * as fs from 'fs'
import path from 'path';
import { getAllItemsAfter } from '../../../adaptors/db-utils/db2';
import { AdapterType } from '@defillama/dimension-adapters/adapters/types';


function getRecordMap(allRecords: any[]) {
  const recordMap: any = {}
  allRecords.forEach((record: any) => {
    if (!recordMap[record.id]) recordMap[record.id] = {}
    recordMap[record.id][record.timeS] = record
  })
  return recordMap
}
const dexValidKeySet = new Set(['dv', 'tv'])
const keysFound = new Set()

async function run() {
  const allDexRecords = await getAllItemsAfter({ adapterType: AdapterType.DEXS })
  const allFeesRecords = await getAllItemsAfter({ adapterType: AdapterType.FEES })
  const allProtocolRecords = await getAllItemsAfter({ adapterType: AdapterType.PROTOCOLS })
  const stats: any = []

  // const dexRecordMap = getRecordMap(allDexRecords)
  // const feesRecordMap = getRecordMap(allFeesRecords)
  const protocolRecordMap = getRecordMap(allProtocolRecords)

  const missingDexRecordsMap: any = {}
  const missingFeesRecordsMap: any = {}
  let totalMissingDexRecordCount = 0
  let totalMissingFeesRecordCount = 0

  Object.entries(protocolRecordMap).forEach(([id, records]: any) => {
    // const dexRecords = dexRecordMap[id] ?? {}
    // const feesRecords = feesRecordMap[id] ?? {}
    const missingDexRecords = {}
    const missingFeesRecords = {}


    let existingDexRecordCount = 0
    let existingFeesRecordCount = 0
    let missingDexRecordCount = 0
    let missingFeesRecordCount = 0
    Object.entries(records).forEach(([timeS, record]: any) => {
      // if (dexRecords[timeS]) {
      //   existingDexRecordCount++
      // } else {
      missingDexRecordCount++
      totalMissingDexRecordCount++
      const { data, ...restRecord } = record
      if (data.breakdown) {
        console.log('breakdown', data.breakdown, timeS, id)
      }
      const clonedData = JSON.parse(JSON.stringify(data))
      Object.keys(clonedData.aggregated).forEach((key: string) => {
        keysFound.add(key)
        if (!dexValidKeySet.has(key)) {
          delete clonedData.aggregated[key]
        }
      })
      missingDexRecords[timeS] = {
        ...restRecord,
        type: AdapterType.DEXS,
        data: clonedData
      }
      // }
      // if (feesRecords[timeS]) {
      //   existingFeesRecordCount++
      // } else {
      missingFeesRecordCount++
      totalMissingFeesRecordCount++
      // const { data, ...restRecord } = record
      if (data.breakdown) {
        console.log('breakdown', data.breakdown, timeS, id)
      }
      const clonedDataFees = JSON.parse(JSON.stringify(data))
      Object.keys(clonedDataFees.aggregated).forEach((key: string) => {
        keysFound.add(key)
        if (dexValidKeySet.has(key)) {
          delete clonedDataFees.aggregated[key]
        }
      })

      missingFeesRecords[timeS] = {
        ...restRecord,
        type: AdapterType.FEES,
        data: clonedDataFees
      }
      // }
    })
    if (missingDexRecordCount) missingDexRecordsMap[id] = missingDexRecords
    if (missingFeesRecordCount) missingFeesRecordsMap[id] = missingFeesRecords
    stats.push({ id, existingFeesRecordCount, missingDexRecordCount, })
    // stats.push({ id, existingDexRecordCount, missingDexRecordCount, existingFeesRecordCount, missingFeesRecordCount })
  })

  console.table(stats)
  console.log('keysFound', keysFound.size, Array.from(keysFound).join(', '))
  console.log({ totalMissingCount: totalMissingDexRecordCount + totalMissingFeesRecordCount, totalMissingDexRecordCount, totalMissingFeesRecordCount })

  const randomStr = Math.floor(Math.random() * 10000)

  const fileName = `protocol-data-${new Date().toISOString().split('T')[0]}-${randomStr}.log`
  const origDataFileName = `protocol-data-orig-${new Date().toISOString().split('T')[0]}-${randomStr}.log`
  console.log('Saving to file:', fileName)
  fs.writeFileSync(path.join(__dirname, fileName), JSON.stringify({ missingDexRecordsMap, missingFeesRecordsMap }))
  fs.writeFileSync(path.join(__dirname, origDataFileName), JSON.stringify(allProtocolRecords))
}


run()
  .catch(console.error)
  .then(() => process.exit(0))
