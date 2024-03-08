// in this script we pull all items from ddb and store in local file cache
// The migration script is split because, reading from ddb is expensive, we want to do this as little as possible, idea is we run this once
// and then we can run the rest of the migration scripts multiple times (and test changes) without having to read from ddb

import { AdaptorRecord, AdaptorRecordType, getAdaptorRecord2, } from "../../adaptors/db-utils/adaptor-record";
import { getAdapterRecordTypes, } from "../../adaptors/handlers/getOverviewProcess";
import { writeToPGCache, } from "../cache/file-cache";
import { AdapterType, } from "@defillama/dimension-adapters/adapters/types";
import loadAdaptorsData from "../../adaptors/data"
import { ProtocolAdaptor } from "../../adaptors/data/types";
import { ADAPTER_TYPES } from "../../adaptors/handlers/triggerStoreAdaptorData";

export function getFileCacheKey(adaptorRecordType: AdapterType) {
  return `tmp/dimensions-data-migration-v1/${adaptorRecordType}`
}

export function getKey(adaptor: ProtocolAdaptor, recordType: AdaptorRecordType) {
  return `${adaptor.id2}-${recordType}`
}

async function run() {
  // Go over all types
  const promises: any = ADAPTER_TYPES.map(async (adapterType) => {
    if (adapterType !== AdapterType.OPTIONS) return;
    
    const data: any = {}
    const fileKey = getFileCacheKey(adapterType)
    const recordTypes = getAdapterRecordTypes(adapterType)
    const pormises = recordTypes.map(i => _writeAdapterType(adapterType, i, data))
    await Promise.all(pormises)
    await writeToPGCache(fileKey, data)
  })
  await Promise.all(promises)
}

let cachePromises: any = {}

async function _writeAdapterType(adapterType: AdapterType, recordType: AdaptorRecordType, data: any) {
  try {
    await writeAdapterType(adapterType, recordType, data)
  } catch (error) {
    console.error(`Couldn't write adaptorRecordType: ${adapterType} recordType: ${recordType}`, error)
  }
}

async function writeAdapterType(adapterType: AdapterType, recordType: AdaptorRecordType, data: any) {
  const timeKey = `-----------------write adapterType: ${adapterType} recordType: ${recordType}`
  console.time(timeKey)

  if (!Object.values(AdaptorRecordType).includes(recordType)) {
    console.error("Invalid data type", recordType)
    return
  }
  const { protocolAdaptors } = loadAdaptorsData(adapterType)
  const adaptersList: ProtocolAdaptor[] = protocolAdaptors

  await Promise.all(adaptersList.map(async (adapter) => {
    // if (adapter.id2 !== '381') return;
    const dataFileKey = `${adapterType}/${adapter.id2}/${recordType}`
    try {
      if (!data[adapter.id2]) data[adapter.id2] = {}
      data[adapter.id2][recordType] = await wrappedGetAdaptorRecord(adapter, recordType)
      console.info('fetched', dataFileKey, data[adapter.id2][recordType].length, 'items')
      // console.log(JSON.stringify(data[adapter.id2][recordType].slice(0, 6), null, 2))
    } catch (error) {
      const errorStr = error!.toString()
      if (!errorStr.includes("No items found ") && !errorStr.includes('No protocols data')) {
        console.error('error', dataFileKey, error)
      }
    }
  }))
  console.timeEnd(timeKey)
}

async function wrappedGetAdaptorRecord(adapter: ProtocolAdaptor, type: AdaptorRecordType): Promise<AdaptorRecord[] | AdaptorRecord> {
  const key = getKey(adapter, type)
  if (!cachePromises[key])
    cachePromises[key] = getAdaptorRecord2({ adapter, type,})
  return cachePromises[key]
}

run().catch(console.error).then(() => process.exit(0))
