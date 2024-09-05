
import { AdapterType, IJSON } from "@defillama/dimension-adapters/adapters/types";
import * as HyperExpress from "hyper-express";
import { CATEGORIES } from "../../adaptors/data/helpers/categories";
import { AdaptorRecordType, AdaptorRecordTypeMap } from "../../adaptors/db-utils/adaptor-record";
import { DEFAULT_CHART_BY_ADAPTOR_TYPE } from "../../adaptors/handlers/getOverviewProcess";
import { formatChainKey, getDisplayChainNameCached, normalizeDimensionChainsMap } from "../../adaptors/utils/getAllChainsFromAdaptors";
import { sluggifyString } from "../../utils/sluggify";
import { errorResponse, successResponse } from "./utils";
import { timeSToUnix, } from "../utils/time";
import { readRouteData } from "../cache/file-cache";

const sluggifiedNormalizedChains: IJSON<string> = Object.keys(normalizeDimensionChainsMap).reduce((agg, chain) => ({ ...agg, [chain]: sluggifyString(chain.toLowerCase()) }), {})

function formatChartData(data: any = {}) {
  return Object.entries(data)
    // .filter(([_key, val]: any) => val) // we want to keep 0 values
    .map(([key, value]: any) => [timeSToUnix(key), value]).sort(([a]: any, [b]: any) => a - b)
}

function getPercentage(a: number, b: number) {
  if (!a || !b) return undefined
  return +Number(((a - b) / b) * 100).toFixed(2)
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

export async function getOverviewProcess2({
  recordType, cacheData, chain, excludeTotalDataChart, excludeTotalDataChartBreakdown,
}: {
  recordType: AdaptorRecordType,
  cacheData: any,
  chain?: string,
  excludeTotalDataChart?: boolean,
  excludeTotalDataChartBreakdown?: boolean,
}) {
  const { summaries, allChains, protocolSummaries = {} } = cacheData
  if (chain) {
    if (chain.includes('-')) chain = chain.replace(/-/g, ' ')
      chain = formatChainKey(chain) // normalize chain name like 'zksync-era' -> 'era' 
    if (chain?.toLowerCase() === 'all') chain = undefined
  }
  const chainDisplayName = chain ? getDisplayChainNameCached(chain) : null
  let summary = chain ? summaries[recordType]?.chainSummary[chain] : summaries[recordType]
  const response: any = {}
  if (!summary) summary = {}

  if (!excludeTotalDataChart) {
    response.totalDataChart = formatChartData(summary.chart)
  }

  if (!excludeTotalDataChartBreakdown) {
    response.totalDataChartBreakdown = formatChartData(summary.chartBreakdown)
  }

  response.breakdown24h = null
  response.chain = chain ?? null
  if (response.chain)
    response.chain = getDisplayChainNameCached(response.chain)
  response.allChains = allChains

  // TODO: missing average1y
  const responseKeys = ['total24h', 'total48hto24h', 'total7d', 'total14dto7d', 'total60dto30d', 'total30d', 'total1y', 'average1y', 'change_1d', 'change_7d', 'change_1m', 'change_7dover7d', 'change_30dover30d',]

  responseKeys.forEach(key => {
    response[key] = summary[key]
  })

  response.change_1d = getPercentage(summary.total24h, summary.total48hto24h)
  response.change_7d = getPercentage(summary.total24h, summary.total7DaysAgo)
  response.change_1m = getPercentage(summary.total24h, summary.total30DaysAgo)
  response.change_7dover7d = getPercentage(summary.total7d, summary.total14dto7d)
  response.change_30dover30d = getPercentage(summary.total30d, summary.total60dto30d)

  const protocolInfoKeys = ['defillamaId', 'name', 'disabled', 'displayName', 'module', 'category', 'logo', 'chains', 'protocolType', 'methodologyURL', 'methodology', 'latestFetchIsOk', 'childProtocols', 'parentProtocol', 'slug',]
  const protocolDataKeys = ['total24h', 'total48hto24h', 'total7d', 'total14dto7d', 'total60dto30d', 'total30d', 'total1y', 'totalAllTime', 'average1y', 'change_1d', 'change_7d', 'change_1m', 'change_7dover7d', 'change_30dover30d', 'breakdown24h', 'total14dto7d',]  // TODO: missing breakdown24h/fix it?

  response.protocols = Object.entries(protocolSummaries).map(([_id, { summaries, info }]: any) => {
    const res: any = {}

    let summary = summaries?.[recordType]
    if (chain) {
      if (!info?.chains.includes(chainDisplayName)) return null
      summary = summary?.chainSummary[chain]
    }


    if (summary)
      protocolDataKeys.forEach(key => res[key] = summary[key])

    // sometimes a protocol is diabled or id is changed, we should disregard these data 
    if (!summary && !info) {
      // console.log('no data found', _id, info)
      return null
    }

    protocolInfoKeys.filter(key => info?.[key]).forEach(key => res[key] = info?.[key])
    res.id = res.defillamaId ?? res.id
    return res
  }).filter((i: any) => i)

  return response
}

export async function getProtocolDataHandler2({
  protocolData, recordType, excludeTotalDataChart, excludeTotalDataChartBreakdown,
}: {
  protocolData?: any,
  recordType: AdaptorRecordType,
  excludeTotalDataChart?: boolean,
  excludeTotalDataChartBreakdown?: boolean,
}) {

  if (!protocolData)
    throw new Error("missing protocol data")


  const { records, summaries, info } = protocolData
  if (!summaries) {
    console.log('missing summaries', info.name)
    return {}
  }
  let summary = summaries[recordType] ?? {}
  // if (!summary) throw new Error("Missing protocol summary")

  const response: any = { ...info }

  const summaryKeys = ['total24h', 'total48hto24h', 'total7d', 'totalAllTime',]
  summaryKeys.forEach(key => response[key] = summary[key])

  if (!excludeTotalDataChart) {
    const chart = {} as any

    Object.entries(records).forEach(([date, value]: any) => {
      if (!value.aggregated[recordType]) return;
      chart[date] = value.aggregated[recordType]?.value
    })
    response.totalDataChart = formatChartData(chart)
  }

  if (!excludeTotalDataChartBreakdown) {
    const chartBreakdown = {} as any
    Object.entries(records).forEach(([date, value]: any) => {
      let breakdown = value.breakdown?.[recordType]
      if (!breakdown) {
        breakdown = value.aggregated[recordType]
        if (!breakdown) return;
        breakdown = { [info.name]: breakdown }
      }
      chartBreakdown[date] = formatBreakDownData(breakdown)
    })
    response.totalDataChartBreakdown = formatChartData(chartBreakdown)
  }

  response.chains = response.chains?.map((chain: string) => getDisplayChainNameCached(chain))
  response.change_1d = getPercentage(summary.total24h, summary.total48hto24h)

  return response


  function formatBreakDownData(data: any) {
    const res = {} as any
    Object.entries(data).forEach(([version, { chains }]: any) => {
      if (!chains) return;
      const label = version
      Object.entries(chains).forEach(([chain, value]: any) => {
        if (!res[chain]) res[chain] = {}
        res[chain][label] = value
      })
    })
    if (!Object.keys(res).length) return null
    return res
  }
}

function genRandomString() {
  return Math.random().toString(36).substring(7)
}

export async function getOverviewFileRoute(req: HyperExpress.Request, res: HyperExpress.Response) {
  const {
    adaptorType, dataType, excludeTotalDataChart, excludeTotalDataChartBreakdown, chainFilter,
  } = getEventParameters(req, true)
  const isLiteStr = excludeTotalDataChart && excludeTotalDataChartBreakdown ? '-lite' : '-all'
  const chainStr = chainFilter && chainFilter !== 'All' ? `-chain/${chainFilter.toLowerCase()}` : ''
  const routeFile = `dimensions/${adaptorType}/${dataType}${chainStr}${isLiteStr}`
  const timeKey = Math.random() + routeFile + '-overview'
  console.time(timeKey)

  const data = await readRouteData(routeFile)
  console.timeEnd(timeKey)

  if (!data) return errorResponse(res, 'Internal server error', { statusCode: 500 })

  if (excludeTotalDataChart) data.totalDataChart = []
  if (excludeTotalDataChartBreakdown) data.totalDataChartBreakdown = []
  return successResponse(res, data)
}

export async function getDimensionProtocolFileRoute(req: HyperExpress.Request, res: HyperExpress.Response) {
  const protocolName = req.path_parameters.name?.toLowerCase()
  const protocolSlug = sluggifyString(protocolName)
  const adaptorType = req.path_parameters.type?.toLowerCase() as AdapterType
  const {
    dataType, excludeTotalDataChart, excludeTotalDataChartBreakdown,
  } = getEventParameters(req, false)
  const isLiteStr = excludeTotalDataChart && excludeTotalDataChartBreakdown ? '-lite' : '-all'
  const routeFile = `dimensions/${adaptorType}/${dataType}-protocol/${protocolSlug}${isLiteStr}`
  const timeKey = Math.random() + routeFile + '-summary'
  console.time(timeKey)

  const data = await readRouteData(routeFile)
  console.timeEnd(timeKey)
  if (!data)
    return errorResponse(res, `${adaptorType[0].toUpperCase()}${adaptorType.slice(1)} for ${protocolName} not found, please visit /overview/${adaptorType} to see available protocols`)

  if (excludeTotalDataChart) data.totalDataChart = []
  if (excludeTotalDataChartBreakdown) data.totalDataChartBreakdown = []
  return successResponse(res, data)
}