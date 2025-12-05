import { roundValues } from "./index";
import { ACCOMULATIVE_ADAPTOR_TYPE, ADAPTER_TYPES, AdaptorRecordType, DIMENSIONS_ADAPTER_CACHE, DIMENSIONS_DB_RECORD, DimensionsDataRecord, DimensionsDataRecordMap, IJSON, PROTOCOL_SUMMARY, } from "../../adaptors/data/types";
import { readFromPGCache, writeToPGCache } from "../db";
import { getTimeSQuarter, timeSToUnix } from "./time";
import { AdapterType } from "../../adaptors/data/types"
import { protocolsById } from "../../protocols/data";
import { parentProtocolsById } from "../../protocols/parentProtocols";

function getFileCacheKeyV2(adapterType: AdapterType) {
  return `dimensions-data-v3.0.1/${adapterType}`
}

async function _getDimensionsCacheV2(adapterType: AdapterType) {
  const timeKey = 'dimensions cache init:' + adapterType

  // console.time(timeKey)

  const fileKey = getFileCacheKeyV2(adapterType)
  let adapterTypesMap = await readFromPGCache(fileKey).then(data => data ?? {})

  // decompress the data
  adapterTypesMap = compressObject(adapterTypesMap, reverseCompressionMap) as DIMENSIONS_ADAPTER_CACHE

  // console.timeEnd(timeKey)

  return adapterTypesMap
}

// to ensure that we pull the cache data only once
export async function getDimensionsCacheV2() {
  const result: any = {}

  await Promise.all(ADAPTER_TYPES.map(async (adapterType) => {
    result[adapterType] = (await _getDimensionsCacheV2(adapterType)) ?? {}
  }))
  return result
}

export async function storeDimensionsCacheV2(data: any) {
  const keys = Object.keys(data)

  // store each adapter type separately, this way we avoid hitting the file size limit
  for (const adapterType of keys) {
    const fileKey = getFileCacheKeyV2(adapterType as AdapterType)
    let adapterCacheData = data[adapterType] as DIMENSIONS_ADAPTER_CACHE
    adapterCacheData = compressObject(adapterCacheData, compressionMap)
    await writeToPGCache(fileKey, adapterCacheData)
  }
}

export async function clearDimensionsCacheV2() {
  for (const adapterType of ADAPTER_TYPES) {
    const fileKey = getFileCacheKeyV2(adapterType)
    await writeToPGCache(fileKey, {}) // clear cache
  }
}

const dimensionsMetadataFile = `dimensions-metadata-v1.0.0`

export async function getDimensionsMetadata() {
  return readFromPGCache(dimensionsMetadataFile)
}

export async function storeDimensionsMetadata(data: any) {
  return writeToPGCache(dimensionsMetadataFile, data)
}


const accumulativeRecordTypeSet = new Set(Object.values(ACCOMULATIVE_ADAPTOR_TYPE))

const protocolCoinInfoCache: Record<string, boolean> = {}

function protocolHasToken(protocolId: string) {
  if (!protocolCoinInfoCache.hasOwnProperty(protocolId)) {
    const protocol = protocolsById[protocolId]
    if (!protocol) {
      protocolCoinInfoCache[protocolId] = false
    } else if (protocol.address || protocol.gecko_id || protocol.cmcId) {
      protocolCoinInfoCache[protocolId] = true
    } else if (protocol.parentProtocol) {
      const parentProtocol = parentProtocolsById[protocol.parentProtocol]
      protocolCoinInfoCache[protocolId] = !!(parentProtocol && (parentProtocol.address || parentProtocol.gecko_id || parentProtocol.cmcId))
    }
  }

  return protocolCoinInfoCache[protocolId]
}

// transform the record to remove empty fields & and add fields that can be computed
export function transformDimensionRecord(json: DIMENSIONS_DB_RECORD) {
  const { timestamp, data, bl, timeS, ...rest } = json
  const protocolId = json.id
  const hasTokenInfo = protocolHasToken(protocolId)
  const aggObject = data.aggregated
  if (!aggObject) return null;

  // json.data = json.data.aggregated  // turns out we cant get rid of 'aggregated' field just yet as later in the code 

  // reduce usd value precision to reduce storage size
  roundValues(data)

  const finalRecord: any = { aggObject, timestamp: timeSToUnix(timeS), }

  // check if breakdown label field is an empty object, if yes remove it
  if (!json.bl || typeof json.bl !== 'object') {
    delete json.bl
  } else {
    roundValues(json.bl)

    // if bl field exists, the adapter code is new, safe to add missing dataType data if it can be computed from other data types

    addDerivedField(AdaptorRecordType.dailySupplySideRevenue, AdaptorRecordType.dailyFees, AdaptorRecordType.dailyRevenue)
    addDerivedField(AdaptorRecordType.dailyRevenue, AdaptorRecordType.dailyFees, AdaptorRecordType.dailySupplySideRevenue)

    if (hasTokenInfo)  // only add holders revenue derived field if the protocol has token info
      addDerivedField(AdaptorRecordType.dailyHoldersRevenue, AdaptorRecordType.dailyRevenue, AdaptorRecordType.dailyProtocolRevenue)

    addDerivedField(AdaptorRecordType.dailyProtocolRevenue, AdaptorRecordType.dailyRevenue, AdaptorRecordType.dailyHoldersRevenue)

    // let hasKeyWithValue = false
    const keys = Object.keys(json.bl) as AdaptorRecordType[]

    for (const key of keys) {
      // iterate over each key, if the value is not an object or is an empty object, or the item is missing in aggObject, delete the key
      if (typeof json.bl[key] !== 'object' || !Object.keys(json.bl[key] ?? {}).length || !aggObject[key])
        delete json.bl[key]
      else {
        aggObject[key].labelBreakdown = json.bl[key]
        // hasKeyWithValue = true
      }
    }

    // // if after cleanup, the bl object is not empty, add it to the final record
    // if (hasKeyWithValue) finalRecord.bl = json.bl
  }

  // reduce cummulative fields like totalVolume/totalFees etc these should be computed
  Object.keys(aggObject).forEach(key => {
    if (accumulativeRecordTypeSet.has(key as AdaptorRecordType)) delete aggObject[key as AdaptorRecordType]
  })

  return { ...rest, timeS, finalRecord }

  function addDerivedField(derivedField: AdaptorRecordType, parentField: AdaptorRecordType, otherField: AdaptorRecordType) {
    const agg = json.data.aggregated

    // If the derived field already exists or if either parent or other field is missing, do nothing
    if (agg[derivedField] || !agg[parentField] || !agg[otherField]) return;

    let value = agg[parentField].value - agg[otherField].value
    if (value < 0) value = 0
    let chains: Record<string, number> = diffNumMap(agg[parentField].chains, agg[otherField].chains)


    agg[derivedField] = { value, chains }
  }

  function diffNumMap(a: Record<string, number>, b: Record<string, number>) {
    const out: Record<string, number> = {}
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const k of keys) {
      const v = (a[k] ?? 0) - (b[k] ?? 0)
      if (v >= 0) out[k] = v
    }
    return out
  }
}

const compressionMap: Record<string, string> = {
  'aggObject': '_a',
  'value': '_v',
  'chains': '_c',
  'labelBreakdown': '_b',
  'timestamp': '_t',
}

const reverseCompressionMap: Record<string, string> = {}  // inverse of compressionMap used in decompressObject
for (const key in compressionMap) {
  reverseCompressionMap[compressionMap[key]] = key
}

// Recursively compress object keys using the compressionMap
export function compressObject(obj: any, compressionMap: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => compressObject(item, compressionMap));
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = compressionMap[key] || key;
    result[newKey] = compressObject(value, compressionMap);
  }

  return result;
}

export function addAggregateRecords(pSummary: PROTOCOL_SUMMARY) {

  const dataTypesSet = pSummary.dataTypes

  // initialize aggregatedRecords if not present
  if (!pSummary.aggregatedRecords) pSummary.aggregatedRecords = { yearly: {}, quarterly: {}, monthly: {} }

  Object.entries(pSummary.records).forEach(([timeS, { aggObject: record }]) => {

    const month = timeS.slice(0, 7)
    const quarter = getTimeSQuarter(timeS)
    const year = timeS.slice(0, 4)

    if (!pSummary.aggregatedRecords!.monthly[month]) pSummary.aggregatedRecords!.monthly[month] = {}
    if (!pSummary.aggregatedRecords!.quarterly[quarter]) pSummary.aggregatedRecords!.quarterly[quarter] = {}
    if (!pSummary.aggregatedRecords!.yearly[year]) pSummary.aggregatedRecords!.yearly[year] = {}

    addAggregatedRecord(pSummary.aggregatedRecords!.monthly[month], record)
    addAggregatedRecord(pSummary.aggregatedRecords!.quarterly[quarter], record)
    addAggregatedRecord(pSummary.aggregatedRecords!.yearly[year], record)
  })


  function addAggregatedRecord(aggRecord: DimensionsDataRecordMap, record: DimensionsDataRecordMap) {
    Object.entries(record).forEach((([dataType, { value, labelBreakdown }]: [AdaptorRecordType, DimensionsDataRecord]) => {
      dataTypesSet.add(dataType)

      if (!aggRecord[dataType]) aggRecord[dataType] = { value: 0, } as any // chains field is intentionally left out
      const aggDataRecordItem: any = aggRecord[dataType]!

      aggDataRecordItem.value += value

      const haslabelBreakdown = typeof labelBreakdown === 'object' && Object.keys(labelBreakdown ?? {}).length
      const labelKey = 'by-label'

      if (haslabelBreakdown) {
        if (!aggDataRecordItem[labelKey]) aggDataRecordItem[labelKey] = {}
        Object.entries(labelBreakdown!).forEach(([k, v]) => {
          if (!aggDataRecordItem[labelKey]![k]) aggDataRecordItem[labelKey]![k] = 0
          aggDataRecordItem[labelKey]![k] += v
        })
      }
    }) as any)
  }
}