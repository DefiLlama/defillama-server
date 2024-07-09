import { ProtocolAdaptor } from "../../adaptors/data/types";
import { AdaptorRecord, AdaptorRecordType, GetAdaptorRecordOptions } from "../../adaptors/db-utils/adaptor-record";
import { sluggifyString } from "../../utils/sluggify";
import { cache } from "../cache";
import { readFromPGCache, writeToPGCache } from "../db";
import { AdapterType } from "@defillama/dimension-adapters/adapters/types";
import parentProtocols from "../../protocols/parentProtocols";
import { RUN_TYPE } from ".";
import { getTimeSDaysAgo } from "./time";

const parentProtocolMap: any = {}
parentProtocols.forEach(protocol => {
  parentProtocolMap[protocol.id] = protocol
})

export function getAdapterCacheKey(adaptor: ProtocolAdaptor, type: AdaptorRecordType, mode: "ALL" | "LAST" | "TIMESTAMP" = "ALL") {
  return `${adaptor.protocolType ?? 'protocol'}-${adaptor.id}-${type}-${mode}`
}

export function getFileCacheKey(adaptorRecordType: AdapterType) {
  return `dimensions-data-v1/${adaptorRecordType}`
}


export function getFileCacheKeyV2() {
  return `dimensions-data-v2-v0.0`
}

let _cacheData: any

// to ensure that we pull the cache data only once
export async function getDimensionsCacheV2(cacheType: RUN_TYPE) {
  if (!_cacheData) _cacheData = _getDimensionsCacheV2(cacheType)
  return _cacheData
}

async function _getDimensionsCacheV2(cacheType = RUN_TYPE.API_SERVER) {
  const timeKey = 'dimensions cache init'
  if (_cacheData) return _cacheData

  console.time(timeKey)

  const fileKey = getFileCacheKeyV2()
  const adapterTypesMap = await readFromPGCache(fileKey).then(data => data ?? {})

  // we create a map of protocol names to protocol data only for rest server
  if (cacheType !== RUN_TYPE.API_SERVER) {
    for (const adapterData of Object.values(adapterTypesMap) as any) {
      adapterData.protocolNameMap = {}
      adapterData.childProtocolNameMap = {}
      adapterData.childProtocolVersionKeyMap = {}
    }
    console.timeEnd(timeKey)
    return adapterTypesMap
  }

  for (const adapterData of Object.values(adapterTypesMap) as any) {
    const protocolNameMap: any = {}
    const childProtocolNameMap: any = {}
    const childProtocolVersionKeyMap: any = {}

    // create a map of parent protocol names to protocol data
    for (const protocolData of Object.values(adapterData.parentProtocols ?? {}) as any) {
      const sluggifiedName = sluggifyString(protocolData.info.name)
      protocolNameMap[sluggifiedName] = protocolData
    }

    for (const protocolData of Object.values(adapterData.protocols) as any) {
      if (protocolData?.info?.name)
        protocolNameMap[sluggifyString(protocolData?.info?.name)] = protocolData
      if (protocolData?.info?.displayName)
        protocolNameMap[sluggifyString(protocolData?.info?.displayName)] = protocolData
      if (protocolData?.info?.childProtocols) {
        for (const childProtocol of protocolData?.info?.childProtocols) {
          if (childProtocol?.name) {
            childProtocolNameMap[sluggifyString(childProtocol?.name)] = protocolData
            childProtocolVersionKeyMap[sluggifyString(childProtocol?.name)] = childProtocol.versionKey
          }
          if (childProtocol?.displayName) {
            childProtocolNameMap[sluggifyString(childProtocol?.displayName)] = protocolData
            childProtocolVersionKeyMap[sluggifyString(childProtocol?.displayName)] = childProtocol.versionKey
          }
        }
      }
    }
    adapterData.protocolNameMap = protocolNameMap
    adapterData.childProtocolNameMap = childProtocolNameMap
    adapterData.childProtocolVersionKeyMap = childProtocolVersionKeyMap
  }

  // copy common data to all adapter types
  const commonData = adapterTypesMap[AdapterType.PROTOCOLS]

  for (const [adapterType, _data] of Object.entries(adapterTypesMap)) {
    const data = _data as any
    if (adapterType === AdapterType.PROTOCOLS) continue
    data.protocolNameMap = { ...commonData.protocolNameMap, ...data.protocolNameMap }
    data.childProtocolNameMap = { ...commonData.childProtocolNameMap, ...data.childProtocolNameMap }
    data.childProtocolVersionKeyMap = { ...commonData.childProtocolVersionKeyMap, ...data.childProtocolVersionKeyMap }
  }

  console.timeEnd(timeKey)

  return adapterTypesMap
}

export async function getAdapterTypeCache(adapterType: AdapterType, cacheType = RUN_TYPE.API_SERVER) {
  return (await getDimensionsCacheV2(cacheType))[adapterType] ?? { summaries: {}, protocols: {} }
}

export async function storeDimensionsCacheV2(data: any) {
  const fileKey = getFileCacheKeyV2()
  // remove redundant data. Theoretically this is not needed, since we only store data in cron script and it does not have these fields
  for (const adapterData of Object.values(data) as any) {
    delete adapterData.protocolNameMap
    delete adapterData.childProtocolNameMap
    delete adapterData.childProtocolVersionKeyMap
  }
  return writeToPGCache(fileKey, data)
}

let cacheLoaded = false

export async function loadDimensionsCache() {
  for (const adaptorRecordType of Object.values(AdapterType)) {
    const fileKey = getFileCacheKey(adaptorRecordType)
    const data = await readFromPGCache(fileKey)
    cache.feesAdapterCache[fileKey] = data
    Object.entries(data).forEach(([key, value]) => {
      data[key] = AdaptorRecord.fromJSON(value)
    })
  }
  cacheLoaded = true
}

export async function getAdaptorRecord2({ adapter, type, mode = 'ALL', adaptorType }: GetAdaptorRecordOptions): Promise<AdaptorRecord[] | AdaptorRecord> {
  if (!cacheLoaded) throw new Error("Dimensions Cache not loaded")
  if (!adaptorType) throw new Error("adaptorType is required")

  const fileKey = getFileCacheKey(adaptorType)
  if (!cache.feesAdapterCache[fileKey]) throw new Error("Cache not found: " + fileKey)

  const cacheKey = getAdapterCacheKey(adapter, type, mode)
  return cache.feesAdapterCache[fileKey][cacheKey]
}

export function computeSummary({ records, versionKey, chain, recordType, }: {
  records: any, 
  versionKey?: string,
  recordType: string,
  chain?: string,
}) {
  const summary: any = {}
  let todayStr = getTimeSDaysAgo(0)
  let moveADayBack = false
  if (!records[todayStr]) {
    moveADayBack = true
    todayStr = getTimeSDaysAgo(0, moveADayBack)
  }
  let yesterdayStr = getTimeSDaysAgo(1, moveADayBack)
  const lastWeekTimeStrings = Array.from({ length: 7 }, (_, i) => getTimeSDaysAgo(i, moveADayBack))

  summary.total24h = getValue(records[todayStr])
  summary.total48hto24h = getValue(records[yesterdayStr])
  summary.total7d = lastWeekTimeStrings.map((dateStr: string) => getValue(records[dateStr] ?? 0)).reduce((acc: number, i: any) => acc + i, 0)
  summary.totalAllTime = Object.values(records).map((r: any) => getValue(r ?? 0)).reduce((acc: number, i: any) => acc + i, 0)

  function getValue(record: any) {
    if (!record) return null
    let data
    if (!versionKey) {
      data = record.aggregated?.[recordType]
    } else {
      data = record.breakdown?.[recordType]?.[versionKey]
    }
    if (!data) return null
    return chain ? data.chains?.[chain] : data.value
  }
  return summary
}