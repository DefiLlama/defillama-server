
import { AdapterType } from "@defillama/dimension-adapters/adapters/types";
import * as HyperExpress from "hyper-express";
import { CATEGORIES } from "../../adaptors/data/helpers/categories";
import { AdaptorRecordType, AdaptorRecordTypeMap } from "../../adaptors/db-utils/adaptor-record";
import { DEFAULT_CHART_BY_ADAPTOR_TYPE } from "../../adaptors/handlers/getOverviewProcess";
import { normalizeDimensionChainsMap } from "../../adaptors/utils/getAllChainsFromAdaptors";
import { sluggifyString } from "../../utils/sluggify";
import { errorResponse, successResponse } from "./utils";
import { getAdapterTypeCache } from "../utils/dimensionsUtils";
import { timeSToUnix } from "../utils/time";

let lastCacheUpdate = new Date().getTime()
const reqCache: any = {}

function clearCache() {
  const now = new Date().getTime()
  if (now - lastCacheUpdate > 1000 * 60 * 60) { // clear cache if it is older than an hour
    Object.keys(reqCache).forEach(key => {
      delete reqCache[key]
    })
    lastCacheUpdate = now
  }
}

export async function getOverviewHandler(req: HyperExpress.Request, res: HyperExpress.Response) {
  clearCache()
  const eventParameters = getEventParameters(req)
  const key = JSON.stringify(eventParameters)
  if (!reqCache[key]) {
    console.time('getOverviewProcess: ' + key)
    reqCache[key] = getOverviewProcess(eventParameters)
    await reqCache[key]
    console.timeEnd('getOverviewProcess: ' + key)
  }

  return successResponse(res, await reqCache[key], 60);
}

async function getOverviewProcess(eventParameters: any) {
  const adapterType = eventParameters.adaptorType
  const recordType = eventParameters.dataType
  const cacheData = await getAdapterTypeCache(adapterType)
  console.time('getAdapterTypeCache: ' + eventParameters.adaptorType)
  const { summaries, protocols } = cacheData
  const chain = eventParameters.chainFilter
  const summary = chain ? summaries[recordType].chainData[chain] : summaries[recordType]
  const response: any = {}
  if (!summary) throw new Error("Summary not found")

  if (!eventParameters.excludeTotalDataChart) {
    response.totalDataChart = formatChartData(summary.chart)
  }
  if (!eventParameters.excludeTotalDataChartBreakdown) {
    response.totalDataChartBreakdown = formatChartData(summary.chartBreakdown)
    console.log(response.totalDataChartBreakdown[0])
  }

  console.timeEnd('getAdapterTypeCache: ' + eventParameters.adaptorType)
  return response
}

function formatChartData(data: any) {
  return Object.entries(data).map(([key, value]: any) => [timeSToUnix(key), value]).sort(([a]: any, [b]: any) => a - b)
}


export async function getDimensionProtocolHandler(req: HyperExpress.Request, res: HyperExpress.Response) {
  clearCache()
  const protocolName = req.path_parameters.name?.toLowerCase()
  const adaptorType = req.path_parameters.type?.toLowerCase() as AdapterType
  const rawDataType = req.query_parameters?.dataType
  const dataKey = `${protocolName}-${adaptorType}-${rawDataType}`
  if (!reqCache[dataKey]) {
    console.time('getProtocolDataHandler: ' + dataKey)
    // reqCache[dataKey] = getProtocolDataHandler(protocolName, adaptorType, rawDataType, { isApi2RestServer: true })
    await reqCache[dataKey]
    console.timeEnd('getProtocolDataHandler: ' + dataKey)
  }
  const data = await reqCache[dataKey]
  if (data) return successResponse(res, data, 2 * 60);

  return errorResponse(res, `${adaptorType[0].toUpperCase()}${adaptorType.slice(1)} for ${protocolName} not found, please visit /overview/${adaptorType} to see available protocols`)
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
  }
}

async function run() {
  const a = await getOverviewProcess({
    adaptorType: 'aggregators',
    dataType: 'dv',
    excludeTotalDataChart: false,
    excludeTotalDataChartBreakdown: false,
  }).catch(e => console.error(e))
  console.log('hello ')
  console.log(a)
}

run().then(_i => process.exit(0))