
import { AdapterType, IJSON } from "@defillama/dimension-adapters/adapters/types";
import * as HyperExpress from "hyper-express";
import { CATEGORIES } from "../../adaptors/data/helpers/categories";
import { AdaptorRecordType, AdaptorRecordTypeMap } from "../../adaptors/db-utils/adaptor-record";
import { DEFAULT_CHART_BY_ADAPTOR_TYPE } from "../../adaptors/handlers/getOverviewProcess";
import { getDisplayChainName, normalizeDimensionChainsMap } from "../../adaptors/utils/getAllChainsFromAdaptors";
import { sluggifyString } from "../../utils/sluggify";
import { errorResponse, successResponse } from "./utils";
import { getAdapterTypeCache } from "../utils/dimensionsUtils";
import { timeSToUnix, timeSToUnixString } from "../utils/time";
import * as fs from 'fs'

let lastCacheUpdate = new Date().getTime()
const reqCache: any = {}
const sluggifiedNormalizedChains: IJSON<string> = Object.keys(normalizeDimensionChainsMap).reduce((agg, chain) => ({ ...agg, [chain]: sluggifyString(chain.toLowerCase()) }), {})

function clearCache() {
  const now = new Date().getTime()
  if (now - lastCacheUpdate > 3 * 60 * 1000) { // clear cache if it is older than three minutes
    Object.keys(reqCache).forEach(key => {
      delete reqCache[key]
    })
    lastCacheUpdate = now
  }
}

const chainNameCache: IJSON<string> = {}

function _getDisplayChainName(chain: string) {
  if (!chainNameCache[chain]) chainNameCache[chain] = getDisplayChainName(chain) ?? chain
  return chainNameCache[chain]
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
  const { summaries, protocols, allChains } = cacheData
  const chain = eventParameters.chainFilter
  const summary = chain ? summaries[recordType].chainSummary[chain] : summaries[recordType]
  const response: any = {}
  if (!summary) throw new Error("Summary not found")

  if (!eventParameters.excludeTotalDataChart) {
    response.totalDataChart = formatChartData(summary.chart)
  }

  if (!eventParameters.excludeTotalDataChartBreakdown) {
    response.totalDataChartBreakdown = formatChartData(summary.chartBreakdown)
  }

  response.breakdown24h = null
  response.chain = chain ?? null
  response.allChains = allChains

  // TODO: missing average1y
  const responseKeys = ['total24h', 'total48hto24h', 'total7d', 'total14dto7d', 'total60dto30d', 'total30d', 'total1y', 'average1y', 'change_1d', 'change_7d', 'change_1m', 'change_7dover7d', 'change_30dover30d',]

  responseKeys.forEach(key => {
    response[key] = summary[key]
  })

  response.change_1d = getPercentage(summary.total24h, summary.total48hto24h)
  response.change_7d = getPercentage(summary.total24h, summary.total7DaysAgo)
  response.change_30d = getPercentage(summary.total24h, summary.total30DaysAgo)
  response.change_7dover7d = getPercentage(summary.total7d, summary.total14dto7d)
  response.change_30dover30d = getPercentage(summary.total30d, summary.total60dto30d)

  const protocolInfoKeys = ['defillamaId', 'name', 'disabled', 'displayName', 'module', 'category', 'logo', 'chains', 'protocolType', 'methodologyURL', 'methodology', 'latestFetchIsOk']
  const protocolDataKeys = ['total24h', 'total48hto24h', 'total7d', 'total14dto7d', 'total60dto30d', 'total30d', 'total1y', 'totalAllTime', 'average1y', 'change_1d', 'change_7d', 'change_1m', 'change_7dover7d', 'change_30dover30d', 'breakdown24h',]  // TODO: missing breakdown24h/fix it?

  response.protocols = Object.values(protocols).map(({ summaries, info }: any) => {
    const res: any = {}

    let summary = summaries?.[recordType]
    if (chain) summary = summary?.chainSummary[chain]

    if (summary)
      protocolDataKeys.forEach(key => res[key] = summary[key])


    protocolInfoKeys.forEach(key => res[key] = info[key])
    return res
  }).filter((i: any) => i)


  console.timeEnd('getAdapterTypeCache: ' + eventParameters.adaptorType)
  return response
}

function formatChartData(data: any) {
  return Object.entries(data).map(([key, value]: any) => [timeSToUnix(key), value]).sort(([a]: any, [b]: any) => a - b)
}

function getPercentage(a: number, b: number) {
  return +Number(((a - b) / b) * 100).toFixed(2)
}

async function getProtocolDataHandler(eventParameters: any) {
  const adapterType = eventParameters.adaptorType
  const recordType = eventParameters.dataType
  const cacheData = await getAdapterTypeCache(adapterType)
  const pName = eventParameters.protocolName.toLowerCase()

  console.time('getProtocolDataHandler: ' + eventParameters.adaptorType)
  let protocolData = cacheData.protocolNameMap[pName]
  let isChildProtocol = false
  let childProtocolVersionKey: string

  if (!protocolData) {
    protocolData = cacheData.childProtocolNameMap[pName]
    if (!protocolData)
      throw new Error("protocol not found")
    isChildProtocol = true
    childProtocolVersionKey = cacheData.childProtocolVersionKeyMap[pName]
  }

  const { records, summaries, info } = protocolData
  const summary = summaries[recordType]
  if (!summary) throw new Error("Missing protocol summary")
  const versionKeyNameMap: IJSON<string> = {}

  const response: any = { ...info, childProtocols: null, }
  if (info.childProtocols?.length > 1) {
    response.childProtocols = info.childProtocols.map((child: any) => {
      versionKeyNameMap[child.versionKey] = child.displayName ?? child.name
      return child.displayName ?? child.name
    })
  }
  const protocolName = response.displayName ?? response.name
  const getBreakdownName = (key: string) => versionKeyNameMap[key] ?? key

  const responseKeys = ['total24h', 'total48hto24h', 'total7d', 'totalAllTime',]
  if (!isChildProtocol)
    responseKeys.forEach(key => response[key] = summary[key])

  if (!eventParameters.excludeTotalDataChart) {
    const chart = {} as any
    Object.entries(records).forEach(([date, value]: any) => {
      if (!value.aggregated[recordType]) return;

      if (!isChildProtocol)
        chart[date] = value.aggregated[recordType]?.value
      else {
        const val = value.breakdown?.[recordType]?.[childProtocolVersionKey]?.value
        if (typeof val === 'number')
          chart[date] = val
      }

    })
    response.totalDataChart = formatChartData(chart)
  }

  if (!eventParameters.excludeTotalDataChartBreakdown) {
    const chartBreakdown = {} as any
    Object.entries(records).forEach(([date, value]: any) => {
      let breakdown = value.breakdown?.[recordType]
      if (!breakdown) {
        if (!value.aggregated[recordType]) return;
        const chains = value.aggregated[recordType].chains
        // breakdown = { [protocolName]: chains }
        breakdown = { [response.module]: chains }
      }
      chartBreakdown[date] = formatBreakDownData(breakdown)
    })
    response.totalDataChartBreakdown = formatChartData(chartBreakdown)
  }

  response.breakdown24h = null // TODO: missing breakdown24h/fix it?
  response.chains = response.chains?.map((chain: string) => _getDisplayChainName(chain))
  response.change_1d = getPercentage(summary.total24h, summary.total48hto24h)

  console.timeEnd('getProtocolDataHandler: ' + eventParameters.adaptorType)
  return response


  function formatBreakDownData(data: any) {
    const res = {} as any
    Object.entries(data).forEach(([label, chains]: any) => {
      if (isChildProtocol && label !== childProtocolVersionKey) return;
      Object.entries(chains).forEach(([chain, value]: any) => {
        if (!res[chain]) res[chain] = {}
        // res[chain][getBreakdownName(label)] = value
        res[chain][label] = value
      })
    })
    return res
  }
}

export async function getDimensionProtocolHandler(req: HyperExpress.Request, res: HyperExpress.Response) {
  clearCache()
  const protocolName = req.path_parameters.name?.toLowerCase()
  const adaptorType = req.path_parameters.type?.toLowerCase() as AdapterType
  const eventParameters = getEventParameters(req, false)
  const dataKey = 'protocol-' + JSON.stringify(eventParameters)
  if (!reqCache[dataKey]) {
    console.time('getProtocolDataHandler: ' + dataKey)
    reqCache[dataKey] = getProtocolDataHandler(eventParameters)
    await reqCache[dataKey]
    console.timeEnd('getProtocolDataHandler: ' + dataKey)
  }
  const data = await reqCache[dataKey]
  if (data) return successResponse(res, data, 2 * 60);

  return errorResponse(res, `${adaptorType[0].toUpperCase()}${adaptorType.slice(1)} for ${protocolName} not found, please visit /overview/${adaptorType} to see available protocols`)
}

function getEventParameters(req: HyperExpress.Request, isSummary = true) {
  const adaptorType = req.path_parameters.type?.toLowerCase() as AdapterType
  const excludeTotalDataChart = req.query_parameters.excludeTotalDataChart?.toLowerCase() === 'true'
  const excludeTotalDataChartBreakdown = req.query_parameters.excludeTotalDataChartBreakdown?.toLowerCase() === 'true'
  const rawDataType = req.query_parameters.dataType
  const rawCategory = req.query_parameters.category
  const category = (rawCategory === 'dexs' ? 'dexes' : rawCategory) as CATEGORIES
  const fullChart = req.query_parameters.fullChart?.toLowerCase() === 'true'
  const dataType = rawDataType ? AdaptorRecordTypeMap[rawDataType] : DEFAULT_CHART_BY_ADAPTOR_TYPE[adaptorType]
  if (!adaptorType) throw new Error("Missing parameter")
  if (!Object.values(AdapterType).includes(adaptorType)) throw new Error(`Adaptor ${adaptorType} not supported`)
  if (category !== undefined && !Object.values(CATEGORIES).includes(category)) throw new Error("Category not supported")
  if (!Object.values(AdaptorRecordType).includes(dataType)) throw new Error("Data type not suported")

  if (!isSummary) {
    const protocolName = req.path_parameters.name?.toLowerCase()
    return { adaptorType, dataType, excludeTotalDataChart, excludeTotalDataChartBreakdown, category, fullChart, protocolName }
  }

  const pathChain = req.path_parameters.chain?.toLowerCase()
  const chainFilterRaw = (pathChain ? decodeURI(pathChain) : pathChain)?.toLowerCase()
  const chainFilter = sluggifiedNormalizedChains[chainFilterRaw] ?? chainFilterRaw

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
    adaptorType: AdapterType.OPTIONS,
    dataType: AdaptorRecordType.dailyNotionalVolume,
    excludeTotalDataChart: false,
    excludeTotalDataChartBreakdown: false,
  }).catch(e => console.error(e))
  /* const a = await getProtocolDataHandler({
    adaptorType: 'aggregators',
    dataType: 'dv',
    excludeTotalDataChart: false,
    excludeTotalDataChartBreakdown: false,
    protocolName: 'Aggre'
  }).catch(e => console.error(e)) */
  // console.log(a)
  fs.writeFileSync('a.json', JSON.stringify(a, null, 2))
}

run().then(_i => process.exit(0))