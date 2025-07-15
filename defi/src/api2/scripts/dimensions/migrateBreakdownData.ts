import '../../utils/failOnError'

import loadAdaptorsData from "../../../adaptors/data"
import { getDimensionsCacheV2, } from "../../utils/dimensionsUtils";

import { RUN_TYPE, } from "../../utils";
import { ADAPTER_TYPES } from '../../../adaptors/handlers/triggerStoreAdaptorData';
import * as fs from 'fs'
import * as path from 'path'
import { initializeTVLCacheDB } from '../../db';
import { AdapterType } from '@defillama/dimension-adapters/adapters/types';
import { init } from '../../../adaptors/db-utils/db2';
import { Tables } from '../../db/tables';
import * as sdk from '@defillama/sdk'
import { PromisePool } from '@supercharge/promise-pool'


async function runConfig() {
  const overallStats = [] as any
  const protocolDataMap = {} as any
  // Go over all types
  // const allCache = await getDimensionsCacheV2(RUN_TYPE.CRON)
  // await initializeTVLCacheDB()
  const protocolConfigAll = {} as any
  for (const adapterType of ADAPTER_TYPES) {
    protocolConfigAll[adapterType] = {}
    const { importModule, protocolAdaptors } = loadAdaptorsData(adapterType)
    for (const { module, displayName, config } of protocolAdaptors) {
      const adaptor = (await importModule(module)).default
      if (adaptor.breakdown) console.log(adapterType, module, 'has breakdown', displayName, config?.displayName)

    }
    /* const configEntries = Object.entries(config)
    for (const [protocolKey, protocolConfig] of configEntries) {
      if (!protocolConfig?.protocolsData) continue;
      protocolConfigAll[adapterType][protocolKey] = protocolConfig
    } */
  }
  /* 
    const replacementConfigMap = {} as any
    for (const adapterType of ADAPTER_TYPES) {
      // if (adapterType !== AdapterType.OPTIONS) continue;
      const { config } = loadAdaptorsData(adapterType)
      const configEntries = Object.entries(config)
      let newConfig = {} as any
      let turnIntoSimpleAdapter = []
      for (const [protocolKey, protocolConfig] of configEntries) {
        if (!protocolConfig?.protocolsData) continue;
        const subProtocolEntries = Object.entries(protocolConfig.protocolsData)
        let otherConfig = {} as any
        switch (adapterType) {
          case AdapterType.DEXS: otherConfig = protocolConfigAll[AdapterType.DERIVATIVES]; break;
          case AdapterType.DERIVATIVES: otherConfig = protocolConfigAll[AdapterType.DEXS]; break;
        }
        // if (otherConfig[protocolKey]) 
        //   console.log('adapterType', adapterType, 'protocolKey', protocolKey, Object.keys(protocolConfig.protocolsData), 'otherConfig', Object.keys(otherConfig[protocolKey].protocolsData))
  
        if (subProtocolEntries.length === 1 && !otherConfig[protocolKey]) {
          console.log(adapterType, 'turn this into a simple adapter, dont add new file: ', protocolKey, protocolConfig.id)
          turnIntoSimpleAdapter.push(protocolKey)
        } else {
          const { id, parentId, protocolsData, ...rest } = protocolConfig
          for (const [subProtocolKey, subProtocolConfig] of subProtocolEntries) {
            let newModuleName = `${protocolKey}-${subProtocolKey}`.replaceAll('.', '_')
            newConfig[newModuleName] = {
              ...rest,
              ...subProtocolConfig,
            }
  
            addSubProtocolAdapterFile(newModuleName + '.ts', { protocolKey, adapterType, subProtocolKey })
          }
        }
  
      }
  
      replacementConfigMap[adapterType] = { newConfig, turnIntoSimpleAdapter }
      // console.log('newConfig', adapterType, newConfig)
  
  
      // console.log('Overall stats:')
      // console.table(overallStats)
      // console.log('Saving to file:', fileName)
      // fs.writeFileSync(path.join(__dirname, 'logs', fileName), JSON.stringify(protocolDataMap, null, 2))
    }
   */
  // const fileName = `migrate-breakdown-config-${new Date().toISOString().split('T')[0]}-${Math.floor(Math.random() * 10000)}.log`
  // fs.writeFileSync(path.join(__dirname, 'logs', fileName), JSON.stringify(replacementConfigMap, null, 2))
}

const runKey = `${new Date().toISOString().split('T')[0]}-${Math.floor(Math.random() * 10000)}`
console.log('runKey: ', runKey)


async function runMigrateData() {
  // Go over all types
  // const allCache = await getDimensionsCacheV2(RUN_TYPE.CRON)
  const protocolConfigAll = {
    [AdapterType.FEES]: {
      '4661-v3': '4661',
      'smbswap-v2': '1632',
      'smbswap-v3': '2895',
    },
    [AdapterType.DEXS]: {
      '3483-swap': '3483',
      '146-dodo': '146',
    },
    [AdapterType.AGGREGATORS]: {
      '2116-zrx': '4628',
      '146-dodo-agg': '5062',
    },
    [AdapterType.DERIVATIVES]: {
      '3396-derivative': '3396',
    },
    [AdapterType.AGGREGATOR_DERIVATIVES]: {
      '1833-unidex-agg-derivative': '1833',
      '3396-logx-aggregator': '3396',
    },
  } as any
  for (const adapterType of ADAPTER_TYPES) {
    if (!protocolConfigAll[adapterType]) protocolConfigAll[adapterType] = {}
    const { config } = loadAdaptorsData(adapterType)
    const configEntries = Object.entries(config)
    for (const [_protocolKey, protocolConfig] of configEntries) {
      if (!protocolConfig?.protocolsData) continue;
      const breakdownId = protocolConfig.id
      const subProtocolEntries = Object.entries(protocolConfig.protocolsData)
      for (const [subProtocolKey, subProtocolConfig] of subProtocolEntries) {
        if (!subProtocolConfig.id) throw new Error(`subProtocolConfig.id is missing for ${adapterType} ${_protocolKey} ${subProtocolKey}`)
        const subKey = `${breakdownId}-${subProtocolKey}`
        if (!protocolConfigAll[adapterType][subKey])
          protocolConfigAll[adapterType][subKey] = subProtocolConfig.id
        else
          console.log('subProtocolKey already exists', adapterType, subKey, protocolConfigAll[adapterType][subProtocolKey], subProtocolConfig.id)
      }
    }

    // console.log('migrate data config', adapterType)
    // console.table(protocolConfigAll[adapterType])
  }


  const dbMappingConfigFile = `migrate-db-mapping-config-${runKey}.log`
  fs.writeFileSync(path.join(__dirname, 'logs', dbMappingConfigFile), JSON.stringify(protocolConfigAll, null, 2))

  const newRecordMap: any = {}

  for (const adapterType of ADAPTER_TYPES) {
    newRecordMap[adapterType] = {}
    const dbMappingConfig = protocolConfigAll[adapterType]
    let allData = await getAllAdapterItemsInDB({ adapterType })
    console.log('data fetched', allData.length, 'adapterType', adapterType)
    allData = allData.filter((record: any) => record.dataValues.data.breakdown)
    console.log('data filtered', allData.length, 'adapterType', adapterType)
    if (allData.length === 0) {
      console.log('No data to migrate for adapter type', adapterType)
      continue
    }
    const dataKeys = new Set()
    const missingDataKeys = new Set()

    allData.forEach((record: any) => {
      Object.values(record.dataValues.data.breakdown).forEach((subRecord: any) => {
        Object.keys(subRecord).forEach((key: string) => {
          const subKey = `${record.dataValues.id}-${key}`
          if (dbMappingConfig[subKey]) {
            dataKeys.add(subKey)
          } else {
            missingDataKeys.add(subKey)
          }
        })
      })
    })

    console.log('dataKeys', dataKeys.size, 'missingDataKeys', missingDataKeys.size, 'adapterType', adapterType)
    const missingDataKeysArray = Array.from(missingDataKeys)
    console.log('missing keys', missingDataKeysArray)


    allData.map(getBreakdownItems)
    const newRecords = Object.values(newRecordMap[adapterType]).map((i: any) => i.pgRecord)
    console.log('newRecords', newRecords.length, 'adapterType', adapterType)
    const fileName = `migrate-breakdown-data-${adapterType}-${runKey}.log`
    fs.writeFileSync(path.join(__dirname, 'logs', fileName), JSON.stringify({ newRecords, currentData: allData.map((record: any) => record.dataValues) }))

    // Delete all the filtered records from the database using the sequelize instance
    console.log(`Deleting ${allData.length} records with breakdown data for adapter type ${adapterType}...`);


    const { errors } = await PromisePool.withConcurrency(42)
      .for(allData)
      .process(async (i: any) => i.destroy())

    if (errors.length) {
      console.error(`[${adapterType}] Failed to delete records: ${errors.length} errors occurred`)
      errors.forEach((error: any) => {
        console.error(`[${adapterType}] Error:`, error)
      })
    }

    console.log(`Successfully deleted ${allData.length} records for adapter type ${adapterType}`);

    await Tables.DIMENSIONS_DATA.bulkCreate(newRecords, {
      updateOnDuplicate: ['timestamp', 'data', 'type']
    });

    console.log(`Successfully inserted ${newRecords.length} records for adapter type ${adapterType}`);
  }

  function getBreakdownItems(record: any) {
    const { id: parentId, timeS, timestamp, data, type } = record.dataValues
    const recordKey = `${type}-${parentId}-${timeS}`
    const mapping = protocolConfigAll[type]
    const breakdown = data.breakdown
    const breakdownByKey = {} as any
    Object.entries(breakdown).forEach(([recordKey, breakdownObj]: any) => {
      const breakdownEntries = Object.entries(breakdownObj)
      breakdownEntries.forEach(([subRecordKey, subRecordValue]: any) => {
        if (!breakdownByKey[`${parentId}-${subRecordKey}`]) breakdownByKey[`${parentId}-${subRecordKey}`] = {}
        breakdownByKey[`${parentId}-${subRecordKey}`][recordKey] = subRecordValue
      })
    })
    for (const [key, value] of Object.entries(breakdownByKey)) {
      const id = mapping[key]
      if (!id) {
        console.log('key not found', key, mapping[key])
        continue
      }
      const data = { aggregated: value }
      const childKey = `${type}-${id}-${timeS}`
      const pgRecord = {
        id: id,
        type,
        timeS: timeS,
        timestamp: timestamp,
        data,
      }

      const existingRecord = newRecordMap[type][childKey]
      if (!existingRecord) {
        newRecordMap[type][childKey] = { pgRecord, parentId: recordKey, parentRecord: record }
      } else {
        console.log('key already exists', childKey, recordKey, existingRecord.parentId, record.dataValues.updatedat, existingRecord.parentRecord.dataValues.updatedat, record.dataValues.updatedat > existingRecord.parentRecord.dataValues.updatedat)

        // if (recordKey === existingRecord.parentId) {
        //   console.log(record.dataValues, existingRecord.parentRecord.dataValues)
        // }

        if (record.dataValues.updatedat > existingRecord.parentRecord.dataValues.updatedat) {
          newRecordMap[type][childKey] = { pgRecord, parentId: recordKey, parentRecord: record }
        }

      }
    }
  }
}


runMigrateData()
  .catch(console.error)
  .then(() => process.exit(0))


function addSubProtocolAdapterFile(fileName: string, { adapterType, protocolKey, subProtocolKey }: { protocolKey: string, adapterType: string, subProtocolKey: string }) {
  if (adapterType === AdapterType.DERIVATIVES) adapterType = AdapterType.DEXS
  const filePath = path.join(__dirname, '../../../../dimension-adapters', adapterType, fileName)
  const fileData = `
import adapter from './${protocolKey}'
const { breakdown,  ...rest } = adapter

export default {
  ...rest,
  adapter: breakdown['${subProtocolKey}'],
}`

  fs.writeFileSync(filePath, fileData, 'utf8')
}


export async function getAllAdapterItemsInDB({ adapterType, }: { adapterType: AdapterType, }) {
  await init()

  const label = `getAllAdapterItemsInDB(${adapterType})`
  console.time(label)

  let result: any = []
  let offset = 0
  const limit = 30000

  while (true) {
    const batch: any = await Tables.DIMENSIONS_DATA.findAll({
      where: { type: adapterType, },
      // raw: true,
      order: [['timestamp', 'ASC']],
      offset,
      limit,
    })
    // console.log(batch[0])
    // process.exit(0)

    result = result.concat(batch)
    sdk.log(`getAllAdapterItemsInDB(${adapterType}) found ${batch.length} total fetched: ${result.length} items`)
    if (batch.length < limit) break
    offset += limit
  }

  sdk.log(`getAllAdapterItemsInDB(${adapterType}) found ${result.length} items`)
  console.timeEnd(label)
  return result
}

