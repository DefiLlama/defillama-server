import { ProtocolAdaptor } from "../../adaptors/data/types";
import { AdaptorRecord, AdaptorRecordType, AdaptorRecordTypeMap, GetAdaptorRecordOptions } from "../../adaptors/db-utils/adaptor-record";
import { cache } from "../cache";
import { readFromPGCache } from "../db";
import { DEFAULT_CHART_BY_ADAPTOR_TYPE, getOverviewProcess } from "../../adaptors/handlers/getOverviewProcess";
import { AdapterType } from "@defillama/dimension-adapters/adapters/types";
import { CATEGORIES } from "../../adaptors/data/helpers/categories";
import * as HyperExpress from "hyper-express";
import { successResponse } from "../routes/utils";
import { normalizeDimensionChainsMap } from "../../adaptors/utils/getAllChainsFromAdaptors";
import { sluggifyString } from "../../utils/sluggify";

export function getAdapterCacheKey(adaptor: ProtocolAdaptor, type: AdaptorRecordType, mode: "ALL" | "LAST" | "TIMESTAMP" = "ALL") {
  return `${adaptor.id}-${type}-${mode}`
}

export function getFileCacheKey(adaptorRecordType: AdapterType) {
  return `dimensions-data/${adaptorRecordType}`
}

export async function getAdaptorRecord2({ adapter, type, mode = 'ALL', adaptorType }: GetAdaptorRecordOptions): Promise<AdaptorRecord[] | AdaptorRecord> {
  if (!adaptorType) throw new Error("adaptorType is required")
  const fileKey = getFileCacheKey(adaptorType)
  if (!cache.feesAdapterCache[fileKey])
    cache.feesAdapterCache[fileKey] = readFromPGCache(fileKey).then(data => {
      Object.entries(data).forEach(([key, value]) => {
        data[key] = AdaptorRecord.fromJSON(value)
      })
      return data
    }) 
  
  const cacheKey = getAdapterCacheKey(adapter, type, mode)
  return (await cache.feesAdapterCache[fileKey])[cacheKey]
}



export async function getOverviewHandler(req: HyperExpress.Request, res: HyperExpress.Response) {
  const eventParameters = getEventParameters(req)
  const key = `overview-${eventParameters.adaptorType}`
  console.time(key)
  const data = await getOverviewProcess(eventParameters)
  console.timeEnd(key)
  return successResponse(res, data, 30 * 60);
}

function getEventParameters(req: HyperExpress.Request) {
  const pathChain = req.path_parameters.chain?.toLowerCase()
  const adaptorType = req.path_parameters.type?.toLowerCase() as AdapterType
  const excludeTotalDataChart = req.query_parameters.excludeTotalDataChart?.toLowerCase() === 'true'
  const excludeTotalDataChartBreakdown = req.query_parameters.excludeTotalDataChartBreakdown?.toLowerCase() === 'true'
  const rawDataType = req.query_parameters.dataType
  const rawCategory = req.query_parameters.category
  const category = (rawCategory === 'dexs' ? 'dexes' : rawCategory) as CATEGORIES
  const fullChart = req.query_parameters.fullChart?.toLowerCase() === 'true'
  const dataType = rawDataType ? AdaptorRecordTypeMap[rawDataType] : DEFAULT_CHART_BY_ADAPTOR_TYPE[adaptorType]
  const chainFilterRaw = (pathChain ? decodeURI(pathChain) : pathChain)?.toLowerCase()
  const chainFilter = Object.keys(normalizeDimensionChainsMap).find(chainKey =>
    chainFilterRaw === sluggifyString(chainKey.toLowerCase())
  ) ?? chainFilterRaw
  if (!adaptorType) throw new Error("Missing parameter")
  if (!Object.values(AdapterType).includes(adaptorType)) throw new Error(`Adaptor ${adaptorType} not supported`)
  if (category !== undefined && !Object.values(CATEGORIES).includes(category)) throw new Error("Category not supported")
  if (!Object.values(AdaptorRecordType).includes(dataType)) throw new Error("Data type not suported")

  return {
    adaptorType,
    excludeTotalDataChart,
    excludeTotalDataChartBreakdown,
    category,
    fullChart,
    dataType,
    chainFilter,
    isApi2RestServer: true,
  }
}