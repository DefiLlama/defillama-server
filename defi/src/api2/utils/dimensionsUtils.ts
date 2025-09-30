import { roundValues } from "./index";
import { ADAPTER_TYPES, AdaptorRecordType, DIMENSIONS_DB_RECORD, } from "../../adaptors/data/types";
import { readFromPGCache, writeToPGCache } from "../db";
import { AdapterType } from "@defillama/dimension-adapters/adapters/types";

function getFileCacheKeyV2(adapterType: AdapterType) {
  return `dimensions-data-v3.0.0/${adapterType}`
}

async function _getDimensionsCacheV2(adapterType: AdapterType) {
  const timeKey = 'dimensions cache init:' + adapterType

  console.time(timeKey)

  const fileKey = getFileCacheKeyV2(adapterType)
  const adapterTypesMap = await readFromPGCache(fileKey).then(data => data ?? {})

  console.timeEnd(timeKey)

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
    await writeToPGCache(fileKey, data[adapterType])
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

// transform the record to remove empty fields & and add fields that can be computed
export function transformDimensionRecord(json: DIMENSIONS_DB_RECORD) {
  const { timestamp, data, } = json

  // json.data = json.data.aggregated  // turns out we cant get rid of 'aggregated' field just yet as later in the code 

  // reduce usd value precision to reduce storage size
  roundValues(data)

  const finalRecord: any = { ...data, timestamp, }

  // check if breakdown label field is an empty object, if yes remove it
  if (!json.bl || typeof json.bl !== 'object') {
    delete json.bl
  } else {
    roundValues(json.bl)

    // if bl field exists, the adapter code is new, safe to add missing dataType data if it can be computed from other data types

    addDerivedField(AdaptorRecordType.dailySupplySideRevenue, AdaptorRecordType.dailyFees, AdaptorRecordType.dailyRevenue)
    addDerivedField(AdaptorRecordType.dailyRevenue, AdaptorRecordType.dailyFees, AdaptorRecordType.dailySupplySideRevenue)

    addDerivedField(AdaptorRecordType.dailyHoldersRevenue, AdaptorRecordType.dailyRevenue, AdaptorRecordType.dailyProtocolRevenue)
    addDerivedField(AdaptorRecordType.dailyProtocolRevenue, AdaptorRecordType.dailyRevenue, AdaptorRecordType.dailyHoldersRevenue)

    let hasKeyWithValue = false
    const keys = Object.keys(json.bl) as AdaptorRecordType[]

    for (const key of keys) {
      // iterate over each key, if the value is not an object or is an empty object, delete the key
      if (typeof json.bl[key] !== 'object' || !Object.keys(json.bl[key] ?? {}).length) delete json.bl[key]
      else hasKeyWithValue = true
    }

    // if after cleanup, the bl object is not empty, add it to the final record
    if (hasKeyWithValue) finalRecord.bl = json.bl
  }

  return { ...json, finalRecord }

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