import { AdaptorRecord, AdaptorRecordType, getAdaptorRecord2, } from "../../adaptors/db-utils/adaptor-record";
import { ACCOMULATIVE_ADAPTOR_TYPE, DEFAULT_CHART_BY_ADAPTOR_TYPE, getExtraN30DTypes, getExtraTypes, } from "../../adaptors/handlers/getOverviewProcess";
import { writeToPGCache, } from "../cache/file-cache";
import { AdapterType, ProtocolType } from "@defillama/dimension-adapters/adapters/types";
import loadAdaptorsData from "../../adaptors/data"
import { ProtocolAdaptor } from "../../adaptors/data/types";
import { getFileCacheKey, getAdapterCacheKey as getKey } from "../utils/dimensionsUtils";

async function run() {
  // Go over all types
  let allTypes = Object.values(AdapterType)
  // allTypes = [AdapterType.OPTIONS]
  const promises: any = allTypes.map(async (adaptorRecordType) => {
    const data: any = {}
    const fileKey = getFileCacheKey(adaptorRecordType)
    const allDataTypes = [DEFAULT_CHART_BY_ADAPTOR_TYPE[adaptorRecordType], ...getExtraTypes(adaptorRecordType)]
    const pormises = allDataTypes.map(i => _writeAdapterType(adaptorRecordType, i, data))
    await Promise.all(pormises)
    // TODO: remove from ddb or move to different db and handle it task runner while pulling data
    // removeErrorField(data)
    await writeToPGCache(fileKey, data)
  })
  await Promise.all(promises)
}

let cachePromises: any = {}

async function _writeAdapterType(adaptorRecordType: AdapterType, dataType: AdaptorRecordType, data: any) {
  try {
    await writeAdapterType(adaptorRecordType, dataType, data)
  } catch (error) {
    console.error(`Couldn't write adaptorRecordType: ${adaptorRecordType} dataType: ${dataType}`, error)
  }
}

async function writeAdapterType(adaptorRecordType: AdapterType, dataType: AdaptorRecordType, data: any) {
  const timeKey = `write adaptorRecordType: ${adaptorRecordType} dataType: ${dataType}`
  console.time(timeKey)

  if (!Object.values(AdaptorRecordType).includes(dataType)) {
    console.error("Invalid data type", dataType)
    return
  }
  const loadedAdaptors = await loadAdaptorsData(adaptorRecordType)
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
    console.error(`Couldn't load adaptors with type ${adaptorRecordType} :${JSON.stringify(error)}`, error)
    return;
  }

  await Promise.all(adaptersList.map(async (adapter) => {
    const dataFileKey = `${dataType}/${adaptorRecordType}/${adapter.id}`
    try {

      const adaptorRecordsRaw = await wrappedGetAdaptorRecord(adapter, dataType)
      data[getKey(adapter, dataType)] = adaptorRecordsRaw
      // This check is made to infer AdaptorRecord[] type instead of AdaptorRecord type
      if (!(adaptorRecordsRaw instanceof Array)) throw new Error("Wrong volume queried")
      if (adaptorRecordsRaw.length === 0) throw new Error(`${adapter.name} ${adapter.id} has no records stored`)

      let lastRecordRaw = adaptorRecordsRaw[adaptorRecordsRaw.length - 1]

      const lastKey = ACCOMULATIVE_ADAPTOR_TYPE[dataType]
      if (lastKey) {
        const rawTotalRecord = await wrappedGetAdaptorRecord(adapter, lastKey, "LAST").catch(_e => { }) as AdaptorRecord | undefined
        if (rawTotalRecord)
          data[getKey(adapter, lastKey, 'LAST')] = rawTotalRecord
        // enable below lines to get & clean cummulative records - but there is no point in caching all cummulative records, we are interested only in the last one
        // const allRecords = await wrappedGetAdaptorRecord(adapter, lastKey)
        // if ((allRecords as any)?.length)
        //   data[getKey(adapter, lastKey)] = allRecords
      }

      for (const recordType of getExtraTypes(adaptorRecordType)) {
        const value = await wrappedGetAdaptorRecord(adapter, recordType, "TIMESTAMP", lastRecordRaw.timestamp).catch(_e => { }) as AdaptorRecord | undefined
        if (value)
          data[getKey(adapter, recordType, 'TIMESTAMP')] = value

      }

      for (const recordType of getExtraN30DTypes(adaptorRecordType)) {
        const value = await wrappedGetAdaptorRecord(adapter, recordType).catch(_e => { }) as AdaptorRecord | undefined
        if (value)
          data[getKey(adapter, recordType)] = value
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

async function wrappedGetAdaptorRecord(adapter: ProtocolAdaptor, type: AdaptorRecordType, mode: "ALL" | "LAST" | "TIMESTAMP" = "ALL", timestamp?: number): Promise<AdaptorRecord[] | AdaptorRecord> {
  const key = getKey(adapter, type, mode)
  if (!cachePromises[key])
    cachePromises[key] = getAdaptorRecord2({ adapter, type, mode, timestamp })
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