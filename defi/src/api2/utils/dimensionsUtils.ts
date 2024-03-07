import { ProtocolAdaptor } from "../../adaptors/data/types";
import { AdaptorRecord, AdaptorRecordType, GetAdaptorRecordOptions } from "../../adaptors/db-utils/adaptor-record";
import { sluggifyString } from "../../utils/sluggify";
import { cache } from "../cache";
import { readFromPGCache, writeToPGCache } from "../db";
import { AdapterType } from "@defillama/dimension-adapters/adapters/types";

export function getAdapterCacheKey(adaptor: ProtocolAdaptor, type: AdaptorRecordType, mode: "ALL" | "LAST" | "TIMESTAMP" = "ALL") {
  return `${adaptor.protocolType ?? 'protocol'}-${adaptor.id}-${type}-${mode}`
}

export function getFileCacheKey(adaptorRecordType: AdapterType) {
  return `dimensions-data-v1/${adaptorRecordType}`
}


export function getFileCacheKeyV2() {
  return `dimensions-data-v2`
}

let dimensionsCache: any

export async function getDimensionsCacheV2() {
  const fileKey = getFileCacheKeyV2()
  if (!dimensionsCache)
    dimensionsCache = readFromPGCache(fileKey).then(data => data ?? {})
  const data = await dimensionsCache
  for (const adapterData of Object.values(data) as any) {
    const protocolNameMap: any = {}
    const childProtocolNameMap: any = {}
    const childProtocolVersionKeyMap: any = {}
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
  return dimensionsCache
}

export async function getAdapterTypeCache(adapterType: AdapterType) {
  return (await getDimensionsCacheV2())[adapterType] ?? { summaries: {}, protocols: {} }
}

export async function storeDimensionsCacheV2(data: any) {
  const fileKey = getFileCacheKeyV2()
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
