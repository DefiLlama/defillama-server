import { AdaptorRecord, AdaptorRecordType, getAdaptorRecord2, } from "../../adaptors/db-utils/adaptor-record";
import { ACCOMULATIVE_ADAPTOR_TYPE, getAdapterRecordTypes, getExtraN30DTypes, getExtraTypes, } from "../../adaptors/handlers/getOverviewProcess";
import { writeToPGCache, } from "../cache/file-cache";
import { AdapterType, } from "@defillama/dimension-adapters/adapters/types";
import loadAdaptorsData from "../../adaptors/data"
import { ProtocolAdaptor } from "../../adaptors/data/types";
import { getFileCacheKey, getAdapterCacheKey as getKey } from "../utils/dimensionsUtils";
import { ADAPTER_TYPES } from "../../adaptors/handlers/triggerStoreAdaptorData";

async function run() {
  // Go over all types
  const promises: any = ADAPTER_TYPES.map(async (adapterType) => {
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
  const timeKey = `write adapterType: ${adapterType} recordType: ${recordType}`
  console.time(timeKey)

  if (!Object.values(AdaptorRecordType).includes(recordType)) {
    console.error("Invalid data type", recordType)
    return
  }
  const loadedAdaptors = loadAdaptorsData(adapterType)
  const protocolsList = Object.keys(loadedAdaptors.config)
  const adaptersList: ProtocolAdaptor[] = []
  try {
    loadedAdaptors.default.forEach(va => {
      if (protocolsList.includes(va.module))
        if (loadedAdaptors.config[va.module]?.enabled)
          adaptersList.push(va)
      return
    })
  } catch (error) {
    console.error(`Couldn't load adaptors with type ${adapterType} :${JSON.stringify(error)}`, error)
    return;
  }

  await Promise.all(adaptersList.map(async (adapter) => {
    const dataFileKey = `${recordType}/${adapterType}/${adapter.id}`
    try {

      const adaptorRecordsRaw = await wrappedGetAdaptorRecord(adapter, recordType)
      data[getKey(adapter, recordType)] = adaptorRecordsRaw
      // This check is made to infer AdaptorRecord[] type instead of AdaptorRecord type
      if (!(adaptorRecordsRaw instanceof Array)) throw new Error("Wrong volume queried")
      if (adaptorRecordsRaw.length === 0) throw new Error(`${adapter.name} ${adapter.id} has no records stored`)

      let lastRecordRaw = adaptorRecordsRaw[adaptorRecordsRaw.length - 1]

      const lastKey = ACCOMULATIVE_ADAPTOR_TYPE[recordType]
      if (lastKey) {
        const rawTotalRecord = await wrappedGetAdaptorRecord(adapter, lastKey, "LAST").catch(_e => { }) as AdaptorRecord | undefined
        if (rawTotalRecord)
          data[getKey(adapter, lastKey, 'LAST')] = rawTotalRecord
        // enable below lines to get & clean cummulative records - but there is no point in caching all cummulative records, we are interested only in the last one
        // const allRecords = await wrappedGetAdaptorRecord(adapter, lastKey)
        // if ((allRecords as any)?.length)
        //   data[getKey(adapter, lastKey)] = allRecords
      }

      for (const recordType of getExtraTypes(adapterType)) {
        const value = await wrappedGetAdaptorRecord(adapter, recordType, "TIMESTAMP", lastRecordRaw.timestamp).catch(_e => { }) as AdaptorRecord | undefined
        if (value)
          data[getKey(adapter, recordType, 'TIMESTAMP')] = value

      }

      for (const recordType of getExtraN30DTypes(adapterType)) {
        const key = getKey(adapter, recordType)
        let existingData = data[key] ?? []
        let lastKey = existingData.length ? existingData[existingData.length - 1].data.eventTimestamp : undefined
        if (lastKey) lastKey -= 2 * 24 * 3600 // 2 days ago
         const value = await wrappedGetAdaptorRecord(adapter, recordType, lastKey).catch(_e => { }) as AdaptorRecord | undefined
        if (value)
          data[getKey(adapter, recordType)] = removeDupsAndSortArrays(existingData, value)
      }

    } catch (error) {
      const errorStr = error!.toString()
      if (!errorStr.includes("No items found ") && !errorStr.includes('No protocols data')) {
        console.error('error', dataFileKey, error)
      }
    }
  }))
  console.timeEnd(timeKey)
}

async function wrappedGetAdaptorRecord(adapter: ProtocolAdaptor, type: AdaptorRecordType, mode: "ALL" | "LAST" | "TIMESTAMP" = "ALL", timestamp?: number, lastKey?: number): Promise<AdaptorRecord[] | AdaptorRecord> {
  const key = getKey(adapter, type, mode)
  if (!cachePromises[key])
    cachePromises[key] = getAdaptorRecord2({ adapter, type, mode, timestamp, lastKey })
  return cachePromises[key]
}

run().catch(console.error).then(() => process.exit(0))

// iterate through object and delete 'error' fields
function removeErrorField(obj: any) {
  if (!Array.isArray(obj) && typeof obj !== 'object') return obj;
  for (const key in obj) {
    if (key === 'error') { // delete error field or should be set it as empty? 
      delete obj[key]
    } else if (typeof obj[key] === 'object') {
      removeErrorField(obj[key])
    }
  }
  return obj
}

function removeDupsAndSortArrays(...arr: any[]) {
  const eventMap = {} as any
  arr.forEach((e) => {
    e.forEach((val: any) => {
      if (!val?.data?.eventTimestamp)
        return
      eventMap[val.data.eventTimestamp] = val
    })
  })
  let array = Object.values(eventMap)
  array.sort((a: any, b: any) => a.data.eventTimestamp - b.data.eventTimestamp)
  return array
}