import { AdaptorRecordType, ProtocolAdaptor } from "../../adaptors/data/types";
import { readFromPGCache, writeToPGCache } from "../db";
import { AdapterType } from "@defillama/dimension-adapters/adapters/types";
import parentProtocols from "../../protocols/parentProtocols";
import { RUN_TYPE } from ".";

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
  return `dimensions-data-v2-v1.0.52`
}

// to ensure that we pull the cache data only once
export async function getDimensionsCacheV2(_cacheType = RUN_TYPE.API_SERVER) {
  const timeKey = 'dimensions cache init'

  console.time(timeKey)

  const fileKey = getFileCacheKeyV2()
  const adapterTypesMap = await readFromPGCache(fileKey).then(data => data ?? {})

  console.timeEnd(timeKey)

  return adapterTypesMap
}

export async function storeDimensionsCacheV2(data: any) {
  const fileKey = getFileCacheKeyV2()

  return writeToPGCache(fileKey, data)
}

const dimensionsMetadataFile = `dimensions-metadata-v1.0.0`

export async function getDimensionsMetadata() {
  return readFromPGCache(dimensionsMetadataFile)
}

export async function storeDimensionsMetadata(data: any) {
  return writeToPGCache(dimensionsMetadataFile, data)
}
