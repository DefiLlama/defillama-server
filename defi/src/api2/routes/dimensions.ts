
import { AdapterType, IJSON } from "../../adaptors/data/types"
import * as HyperExpress from "hyper-express";
import { ADAPTER_TYPES, AdaptorRecordType, AdaptorRecordTypeMap, DEFAULT_CHART_BY_ADAPTOR_TYPE, DIMENSIONS_ADAPTER_CACHE, getAdapterRecordTypes, PROTOCOL_SUMMARY } from "../../adaptors/data/types";
import { getChainKeyFromLabel, getChainLabelFromKey, } from "../../utils/normalizeChain";
import { sluggifyString, sluggifyCategoryString } from "../../utils/sluggify";
import { readRouteData, storeRouteData } from "../cache/file-cache";
import { getTimeSDaysAgo, timeSToUnix, } from "../utils/time";
import { errorResponse, fileResponse, successResponse, validateProRequest } from "./utils";

function formatChartData(data: any = {}) {
  const result = [];
  for (const key in data) {
    // support key is both timeS and unix timestamp
    result.push([(typeof key === 'string' && key.includes('-')) ? timeSToUnix(key) : Number(key), data[key]]);
  }
  return result.sort(([a]: any, [b]: any) => a - b);
}

function getPercentage(a: number, b: number) {
  if (!a || !b) return undefined
  return +Number(((a - b) / b) * 100).toFixed(2)
}

const validMetricTypesSet = new Set(Object.values(AdapterType)) as Set<string>
const validRecordTypesSet = new Set(Object.values(AdaptorRecordType)) as Set<string>
const unixStartOfTodayTimestamp = timeSToUnix(getTimeSDaysAgo(0))

function getEventParameters(req: HyperExpress.Request, isSummary = true) {
  const isProRoute = !!(req as any).isProRoute as boolean
  const adaptorType = req.path_parameters.type?.toLowerCase() as AdapterType
  const excludeTotalDataChart = req.query_parameters.excludeTotalDataChart?.toLowerCase() === 'true'
  const includeLabelBreakdown = isProRoute && req.query_parameters.includeLabelBreakdown?.toLowerCase() === 'true'
  const excludeTotalDataChartBreakdown = req.query_parameters.excludeTotalDataChartBreakdown?.toLowerCase() === 'true'
  const rawDataType = req.query_parameters.dataType
  const fullChart = req.query_parameters.fullChart?.toLowerCase() === 'true'
  const dataType = rawDataType ? AdaptorRecordTypeMap[rawDataType] : DEFAULT_CHART_BY_ADAPTOR_TYPE[adaptorType]
  if (!adaptorType) throw new Error("Missing parameter")

  if (!validMetricTypesSet.has(adaptorType)) throw new Error(`Adaptor ${adaptorType} not supported`)
  if (!validRecordTypesSet.has(dataType)) throw new Error("Data type not suported")
  
  let category = req.path_parameters.category ? sluggifyCategoryString(req.path_parameters.category) : undefined;
  if (!category) {
    category = req.query_parameters.category ? sluggifyCategoryString(req.query_parameters.category) : undefined;
  }

  const response: {
    adaptorType: AdapterType,
    excludeTotalDataChart: boolean,
    excludeTotalDataChartBreakdown: boolean,
    category?: string,
    protocolName?: string,  // applicable only for protocol routes
    chainKeyFilter?: string,   // applicable only for summary routes
    fullChart: boolean,
    dataType: AdaptorRecordType,
    includeLabelBreakdown: boolean,
  } = {
    adaptorType,
    excludeTotalDataChart,
    excludeTotalDataChartBreakdown,
    category,
    fullChart,
    dataType,
    includeLabelBreakdown,
  }

  if (isSummary) {

    const pathChain = req.path_parameters.chain
    const chainFilterRaw = pathChain ? decodeURI(pathChain) : pathChain
    response.chainKeyFilter = chainFilterRaw ? getChainKeyFromLabel(chainFilterRaw) : undefined

  } else {
    response.protocolName = req.path_parameters.name?.toLowerCase()
  }

  return response
}

async function getOverviewProcess({
  recordType, cacheData, chain,
}: {
  recordType: AdaptorRecordType,
  cacheData: any,
  chain?: string,
}) {
  const { summaries, allChains, protocolSummaries = {} } = cacheData
  if (chain)
    chain = getChainKeyFromLabel(chain) // normalize chain name like 'zksync-era' -> 'era' 

  const chainDisplayName = chain ? getChainLabelFromKey(chain) : null
  let summary = chain ? summaries[recordType]?.chainSummary[chain] : summaries[recordType]
  const response: any = {}
  if (!summary) summary = {}

  response.totalDataChart = formatChartData(summary.chart)
  response.totalDataChartBreakdown = formatChartData(summary.chartBreakdown)
  fixChartLastRecord(response)

  response.breakdown24h = null
  response.breakdown30d = null
  response.chain = chain ?? null
  if (response.chain)
    response.chain = getChainLabelFromKey(response.chain)
  response.allChains = allChains

  // These fields are for the global/chain level data
  const responseKeys = ['total24h', 'total48hto24h', 'total7d', 'total14dto7d', 'total60dto30d', 'total30d', 'total1y', 'average1y', 'monthlyAverage1y', 'change_1d', 'change_7d', 'change_1m', 'change_7dover7d', 'change_30dover30d', 'total7DaysAgo', 'total30DaysAgo', 'totalAllTime']

  responseKeys.forEach(key => {
    response[key] = summary[key]
  })
  let protocolTotalAllTimeSum = 0

  response.change_1d = getPercentage(summary.total24h, summary.total48hto24h)
  response.change_7d = getPercentage(summary.total24h, summary.total7DaysAgo)
  response.change_1m = getPercentage(summary.total24h, summary.total30DaysAgo)
  response.change_7dover7d = getPercentage(summary.total7d, summary.total14dto7d)
  response.change_30dover30d = getPercentage(summary.total30d, summary.total60dto30d)

  // These fields are for the protocol level data
  const protocolInfoKeys = ['defillamaId', 'name', 'displayName', 'module', 'category', 'logo', 'chains', 'protocolType', 'methodologyURL', 'methodology', 'childProtocols', 'parentProtocol', 'slug', 'linkedProtocols', 'doublecounted', 'breakdownMethodology', 'hasLabelBreakdown',]
  const protocolDataKeys = ['total24h', 'total48hto24h', 'total7d', 'total14dto7d', 'total60dto30d', 'total30d', 'total1y', 'totalAllTime', 'average1y', 'monthlyAverage1y', 'change_1d', 'change_7d', 'change_1m', 'change_7dover7d', 'change_30dover30d', 'breakdown24h', 'breakdown30d', 'total14dto7d', 'total7DaysAgo', 'total30DaysAgo']

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

    if (!summary?.recordCount) return null; // if there are no data points, we should filter out the protocol
    if (summary?.totalAllTime) protocolTotalAllTimeSum += summary.totalAllTime

    protocolInfoKeys.filter(key => info?.[key]).forEach(key => res[key] = info?.[key])
    res.id = res.defillamaId ?? res.id
    return res
  }).filter((i: any) => i)
  if (!response.totalAllTime) response.totalAllTime = protocolTotalAllTimeSum

  return response
}

// chain is key: ethereum, bsc
async function getCategoryData({ recordType, cacheData, category, chain }: { recordType: AdaptorRecordType, cacheData: any, category: string, chain?: string }) {
  const { summaries, protocolSummaries = {} } = cacheData

  const chainDisplayName = chain ? getChainLabelFromKey(chain) : null
  let summary = summaries[recordType]?.categorySummary[category]
  if (chain) summary = summaries[recordType]?.categorySummary[category].chainSummary[chain]
  const response: any = {}
  if (!summary) summary = {}

  response.category = category;
  if (chain) response.chain = chainDisplayName;
  response.totalDataChart = formatChartData(summary.chart)
  response.totalDataChartBreakdown = formatChartData(summary.chartBreakdown)
  fixChartLastRecord(response)

  response.allCategories = Object.keys(summaries[recordType]?.categorySummary);
  response.allChains = Object.keys(summaries[recordType]?.categorySummary[category].chainSummary).map(i => getChainLabelFromKey(i));

  // These fields are for the category level data
  const responseKeys = ['total24h', 'total48hto24h', 'total7d', 'total14dto7d', 'total60dto30d', 'total30d', 'total1y', 'average1y', 'monthlyAverage1y', 'change_1d', 'change_7d', 'change_1m', 'change_7dover7d', 'change_30dover30d', 'total7DaysAgo', 'total30DaysAgo', 'totalAllTime']

  responseKeys.forEach(key => {
    response[key] = summary[key]
  })
  let protocolTotalAllTimeSum = 0

  response.change_1d = getPercentage(summary.total24h, summary.total48hto24h)
  response.change_7d = getPercentage(summary.total24h, summary.total7DaysAgo)
  response.change_1m = getPercentage(summary.total24h, summary.total30DaysAgo)
  response.change_7dover7d = getPercentage(summary.total7d, summary.total14dto7d)
  response.change_30dover30d = getPercentage(summary.total30d, summary.total60dto30d)

  // These fields are for the protocol level data
  const protocolInfoKeys = ['defillamaId', 'name', 'displayName', 'module', 'category', 'logo', 'chains', 'protocolType', 'methodologyURL', 'methodology', 'childProtocols', 'parentProtocol', 'slug', 'linkedProtocols', 'doublecounted', 'breakdownMethodology', 'hasLabelBreakdown',]
  const protocolDataKeys = ['total24h', 'total48hto24h', 'total7d', 'total14dto7d', 'total60dto30d', 'total30d', 'total1y', 'totalAllTime', 'average1y', 'monthlyAverage1y', 'change_1d', 'change_7d', 'change_1m', 'change_7dover7d', 'change_30dover30d', 'breakdown24h', 'breakdown30d', 'total14dto7d', 'total7DaysAgo', 'total30DaysAgo']

  response.protocols = Object.entries(protocolSummaries).map(([_id, { summaries, info }]: any) => {
    const res: any = {}
    const categories = getProtocolCategories(info)
    if (!categories.includes(category)) return null

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

    if (!summary?.recordCount) return null; // if there are no data points, we should filter out the protocol
    if (summary?.totalAllTime) protocolTotalAllTimeSum += summary.totalAllTime

    protocolInfoKeys.filter(key => info?.[key]).forEach(key => res[key] = info?.[key])
    res.id = res.defillamaId ?? res.id
    return res
  }).filter((i: any) => i)
  if (!response.totalAllTime) response.totalAllTime = protocolTotalAllTimeSum

  return response
  
  function getProtocolCategories(info: any): Array<string> {
    if (!info) return [];
    // we treat tags same as category and use labels (not slugs) for keys, only use slugs on storage and query
    // ex: we use 'Dexs' when cumputing data, and use 'dexs' as storage and query on api later
    let _pCategories = info.category ? [info.category] : [];
    if (info.tags) _pCategories = _pCategories.concat(info.tags);
    return _pCategories;
  }
}

// some protocols dont support pulling current day data (can only pull daily data after the day is complete instead of past 24 hours)
// so we fix the last record to be the same as previous day if the last record is for today
function fixChartLastRecord(response: any) {
  // nothing to fix if there are less than 2 records
  if (!(response?.totalDataChart?.length > 1)) return;
  if (!(response?.totalDataChartBreakdown?.length > 1)) return;

  const lastChartRecord = response.totalDataChart[response.totalDataChart.length - 1]
  const lastChartBreakdownRecord = response.totalDataChartBreakdown[response.totalDataChartBreakdown.length - 1]
  const yesterdayChartBreakdownRecord = response.totalDataChartBreakdown[response.totalDataChartBreakdown.length - 2]

  // nothing to fix if the last record is not for today
  if (lastChartRecord[0] !== unixStartOfTodayTimestamp || lastChartBreakdownRecord[0] !== unixStartOfTodayTimestamp) return;

  const todayBreakdown = lastChartBreakdownRecord[1]
  const yesterdayBreakdown = yesterdayChartBreakdownRecord[1]
  let todayTotalValue = lastChartRecord[1]

  Object.entries(yesterdayBreakdown).forEach(([key, value]: any) => {
    if (todayBreakdown.hasOwnProperty(key)) return;
    todayBreakdown[key] = value // add missing key from yesterday
    todayTotalValue += value
  })

  lastChartRecord[1] = todayTotalValue
}

async function getProtocolDataHandler({
  protocolData, recordType,
}: {
  protocolData?: any,
  recordType: AdaptorRecordType,
}) {

  if (!protocolData)
    throw new Error("missing protocol data")


  const { records: _records, summaries, info } = protocolData
  if (!summaries) {
    console.log('missing summaries', info?.name)
    return {}
  }
  let summary = summaries[recordType] ?? {}
  // if (!summary) throw new Error("Missing protocol summary")

  const response: any = { ...info }
  const records = _records ?? {}

  const summaryKeys = ['total24h', 'total48hto24h', 'total7d', 'total30d', 'totalAllTime',]
  summaryKeys.forEach(key => response[key] = summary[key])

  const chart = {} as any
  const chartBreakdown = {} as any // this is old format, meant for parent protocol to show breakdown by child protocol & chain
  const chartLabelBreakdown = {} as any  // this is meant to show breakdown by data source, like swap fees, bribes, liquidation, etc.
  let hasLabelBreakdown = false

  Object.entries(records).forEach(([date, value]: any) => {
    if (value.aggObject[recordType])
      chart[date] = value.aggObject[recordType]?.value

    if (value.aggObject[recordType]?.labelBreakdown) {
      hasLabelBreakdown = true
      chartLabelBreakdown[date] = value.aggObject[recordType]?.labelBreakdown
    }

    // add child protocol/chain level breakdown

    let breakdown = value.breakdown?.[recordType]
    if (!breakdown) {
      const agg = value.aggObject[recordType]
      if (!agg) return;
      breakdown = { [info?.name ?? 'Unknown']: agg }
    }
    chartBreakdown[date] = formatBreakDownData(breakdown)
  })

  response.totalDataChart = formatChartData(chart)
  response.totalDataChartBreakdown = formatChartData(chartBreakdown)
  response.hasLabelBreakdown = hasLabelBreakdown

  if (hasLabelBreakdown) {
    response.labelBreakdownChart = formatChartData(chartLabelBreakdown)
  }

  response.chains = response.chains?.map((chain: string) => getChainLabelFromKey(chain))
  if (response.totalDataChartBreakdown) {
    response.totalDataChartBreakdown.forEach(([_, chart]: any) => {
      Object.entries(chart ?? {}).forEach(([chain, value]: any) => {
        delete chart[chain]
        chart[getChainLabelFromKey(chain)] = value
      })
    })
  }
  response.change_1d = getPercentage(summary.total24h, summary.total48hto24h)

  return response


  function formatBreakDownData(data: any) {
    const res = {} as any
    Object.entries(data ?? {}).forEach(([version, { chains }]: any) => {
      if (!chains) return;
      const label = version
      Object.entries(chains ?? {}).forEach(([chain, value]: any) => {
        if (!res[chain]) res[chain] = {}
        res[chain][label] = value
      })
    })
    if (!Object.keys(res).length) return null
    return res
  }
}

export async function getOverviewFileRoute(req: HyperExpress.Request, res: HyperExpress.Response) {
  const {
    adaptorType, dataType, excludeTotalDataChart, excludeTotalDataChartBreakdown, chainKeyFilter,
  } = getEventParameters(req, true)

  const isAllChainDataRequested = chainKeyFilter === 'chain-breakdown'

  if (isAllChainDataRequested && (req as any).isProRoute) {

    const routeFile = `dimensions/${adaptorType}/${dataType}/chain-total-data-chart`
    return fileResponse(routeFile, res)
  }

  const isLiteStr = excludeTotalDataChart && excludeTotalDataChartBreakdown ? '-lite' : '-all'
  const chainStr = (chainKeyFilter && chainKeyFilter !== 'all') ? `-chain/${chainKeyFilter}` : ''
  const routeSubPath = `${adaptorType}/${dataType}${chainStr}${isLiteStr}`
  const routeFile = `dimensions/${routeSubPath}`

  const data = await readRouteData(routeFile)

  if (!data) return errorResponse(res, 'Internal server error', { statusCode: 500 })

  if (excludeTotalDataChart) data.totalDataChart = []
  if (excludeTotalDataChartBreakdown) data.totalDataChartBreakdown = []
  return successResponse(res, data)
}

export async function getDimensionProtocolFileRoute(req: HyperExpress.Request, res: HyperExpress.Response) {
  const protocolName = req.path_parameters.name?.toLowerCase()
  const protocolSlug = sluggifyString(protocolName)
  const adaptorType = req.path_parameters.type?.toLowerCase() as AdapterType

  if ((adaptorType as any) === 'financial-statement') // redirect to financial statement route handler
    return getProtocolFinancials(req, res)

  const {
    dataType, excludeTotalDataChart, excludeTotalDataChartBreakdown, includeLabelBreakdown,
  } = getEventParameters(req, false)
  let protocolFileExt = excludeTotalDataChart && excludeTotalDataChartBreakdown ? '-lite' : '-all'

  if (includeLabelBreakdown) protocolFileExt = '-bl' // include label breakdown data

  const routeSubPath = `${adaptorType}/${dataType}-protocol/${protocolSlug}${protocolFileExt}`
  const routeFile = `dimensions/${routeSubPath}`
  const errorMessage = `${adaptorType[0].toUpperCase()}${adaptorType.slice(1)} for ${protocolName} not found, please visit /overview/${adaptorType} to see available protocols`

  const data = await readRouteData(routeFile)
  if (!data)
    return errorResponse(res, errorMessage)

  if (excludeTotalDataChart) data.totalDataChart = []
  if (excludeTotalDataChartBreakdown) data.totalDataChartBreakdown = []
  return successResponse(res, data)
}

// these adapter types require category query param when query data
// use default category if category query param wasn't given
const DefaultAdapterTypeCategoryMap: Record<string, string> = {
  [AdapterType.DEXS]: 'dexs',
  [AdapterType.DERIVATIVES]: 'derivatives',
  [AdapterType.NORMALIZED_VOLUME]: 'derivatives',
  [AdapterType.OPEN_INTEREST]: 'derivatives',
  [AdapterType.OPTIONS]: 'options',
}

export function getDimensionOverviewRoutes(route: 'overview' | 'chart' | 'chart-chain-breakdown' | 'chart-protocol-breakdown') {
  return async function (req: HyperExpress.Request, res: HyperExpress.Response) {
    const { adaptorType, dataType, category } = getEventParameters(req, true)

    // retrun a subnet of protocol (per category) only
    if (Object.keys(DefaultAdapterTypeCategoryMap).includes(adaptorType)) {
      return await returnSubCategoryData();
    }
    
    if (route === 'chart-chain-breakdown') {
      const routeFile = `dimensions/${adaptorType}/${dataType}/chain-total-data-chart`
      return fileResponse(routeFile, res)
    } else {
      const isLiteStr = route === 'overview' ? '-lite' : '-all'
      const routeSubPath = `${adaptorType}/${dataType}${isLiteStr}`
      const routeFile = `dimensions/${routeSubPath}`

      const data = await readRouteData(routeFile)

      if (!data) return errorResponse(res, 'Internal server error', { statusCode: 500 })

      if (route === 'chart-protocol-breakdown') {
        return successResponse(res, data.totalDataChartBreakdown)
      } else {
        data.totalDataChartBreakdown = undefined;

        if (route === 'overview') {
          data.totalDataChart = undefined;
          return successResponse(res, data)
        } else {
          return successResponse(res, data.totalDataChart)
        }
      }
    }
    
    // return data in a given category
    async function returnSubCategoryData() {
      let filterCategory = category;
      if (!filterCategory) filterCategory = DefaultAdapterTypeCategoryMap[adaptorType];
      
      let routeFileExt = '';
      if (route === 'overview') routeFileExt = '';
      else routeFileExt += route;
      const routeSubPath = `${adaptorType}/${dataType}-category/${filterCategory}-${routeFileExt}`;
      const routeFile = `dimensions/${routeSubPath}`; 
      
      const data = await readRouteData(routeFile);
  
      if (!data) return errorResponse(res, 'Internal server error', { statusCode: 500 });
  
      return successResponse(res, data);
    }
  }
}

export function getDimensionChainRoutes(route: 'overview' | 'chart' | 'chart-protocol-breakdown') {
  return async function (req: HyperExpress.Request, res: HyperExpress.Response) {
    const { adaptorType, dataType, chainKeyFilter, category } = getEventParameters(req, true)

    // retrun a subnet of protocol (per category) only
    if (Object.keys(DefaultAdapterTypeCategoryMap).includes(adaptorType)) {
      return await returnSubCategoryChainData();
    }
    
    const isLiteStr = route === 'overview' ? '-lite' : '-all'
    const chainStr = (chainKeyFilter && chainKeyFilter !== 'all') ? `-chain/${chainKeyFilter}` : ''
    const routeSubPath = `${adaptorType}/${dataType}${chainStr}${isLiteStr}`
    const routeFile = `dimensions/${routeSubPath}`

    const data = await readRouteData(routeFile)

    if (!data) return errorResponse(res, 'Internal server error', { statusCode: 500 })

    if (route === 'chart-protocol-breakdown') {
      return successResponse(res, data.totalDataChartBreakdown)
    } else {
      data.totalDataChartBreakdown = undefined;

      if (route === 'overview') {
        data.totalDataChart = undefined;
        return successResponse(res, data)
      } else {
        return successResponse(res, data.totalDataChart)
      }
    }
    
    // return data in a given category - chain
    async function returnSubCategoryChainData() {
      let filterCategory = category;
      if (!filterCategory) filterCategory = DefaultAdapterTypeCategoryMap[adaptorType];
      
      let routeFileExt = '';
      if (route === 'overview') routeFileExt = '';
      else routeFileExt += route;
      const routeSubPath = `${adaptorType}/${dataType}-category/${filterCategory}-chain/${chainKeyFilter}-${routeFileExt}`;
      const routeFile = `dimensions/${routeSubPath}`;
      
      const data = await readRouteData(routeFile);
  
      if (!data) return errorResponse(res, 'Internal server error', { statusCode: 500 });
  
      return successResponse(res, data);
    }
  }
}

export function getDimensionCategoryRoutes(route: 'overview' | 'chart' | 'chart-protocol-breakdown' | 'chart-chain-breakdown') {
  return async function (req: HyperExpress.Request, res: HyperExpress.Response) {
    const { adaptorType, dataType, category } = getEventParameters(req, true)

    if (!category) return errorResponse(res, 'Category not supported', { statusCode: 400 })
    
    let routeFileExt = '';
    if (route === 'overview') routeFileExt = '';
    else routeFileExt += route;
    const routeSubPath = `${adaptorType}/${dataType}-category/${category}-${routeFileExt}`;
    const routeFile = `dimensions/${routeSubPath}`; 
    
    const data = await readRouteData(routeFile);

    if (!data) return errorResponse(res, 'Internal server error', { statusCode: 500 });

    return successResponse(res, data);
  }
}

export function getDimensionCategoryChainRoutes(route: 'overview' | 'chart' | 'chart-protocol-breakdown') {
  return async function (req: HyperExpress.Request, res: HyperExpress.Response) {
    const { adaptorType, dataType, category, chainKeyFilter } = getEventParameters(req, true)

    if (!category) return errorResponse(res, 'Category not supported', { statusCode: 400 })
    
    let routeFileExt = '';
    if (route === 'overview') routeFileExt = '';
    else routeFileExt += route;
    const routeSubPath = `${adaptorType}/${dataType}-category/${category}-chain/${chainKeyFilter}-${routeFileExt}`;
    const routeFile = `dimensions/${routeSubPath}`; 
    
    const data = await readRouteData(routeFile);

    if (!data) return errorResponse(res, 'Internal server error', { statusCode: 500 });

    return successResponse(res, data);
  }
}

export function getDimensionProtocolRoutes(route: 'overview' | 'chart' | 'chart-chain-breakdown' | 'chart-version-breakdown' | 'chart-label-breakdown') {
  return async function (req: HyperExpress.Request, res: HyperExpress.Response) {
    const protocolName = req.path_parameters.name?.toLowerCase()
    const protocolSlug = sluggifyString(protocolName)
    const adaptorType = req.path_parameters.type?.toLowerCase() as AdapterType

    if ((adaptorType as any) === 'financial-statement') // redirect to financial statement route handler
      return getProtocolFinancials(req, res)

    const { dataType } = getEventParameters(req, false)
    const protocolFileExt = route === 'overview' ? 'lite' : route;

    const routeSubPath = `${adaptorType}/${dataType}-protocol/${protocolSlug}${protocolFileExt}`
    const routeFile = `dimensions/${routeSubPath}`
    const errorMessage = `${adaptorType[0].toUpperCase()}${adaptorType.slice(1)} for ${protocolName} not found, please visit /overview/${adaptorType} to see available protocols`

    const data = await readRouteData(routeFile)
    if (!data)
      return errorResponse(res, errorMessage)

    return successResponse(res, data)
  }
}

async function getProtocolFinancials(req: HyperExpress.Request, res: HyperExpress.Response) {
  validateProRequest(req, res)  // ensure that only pro users can access financial statement data

  const protocolSlug = sluggifyString(req.path_parameters.name?.toLowerCase())
  const routeSubPath = `${AdapterType.FEES}/agg-protocol/${protocolSlug}`
  const dimensionsDataRouteFile = `dimensions/${routeSubPath}`
  const emisssionDataRouterFile = `emissions/${protocolSlug}`
  const dimentionsData = await readRouteData(dimensionsDataRouteFile) // read dimensions data from cache file
  const emissionsData = await readRouteData(emisssionDataRouterFile) // read emissions data from cache file
  const adjustedData = adjustDataProtocolFinancials(dimentionsData, emissionsData) // tranform data
  return successResponse(res, adjustedData, 10); // cache 10 minutes
}

const enum FinancialStatementRecords {
  grossProtocolRevenue = "Gross Protocol Revenue",
  costOfRevenue = "Cost Of Revenue",
  grossProfit = "Gross Profit",
  // othersProfit = "Others Profit",
  tokenHolderNetIncome = "Token Holder Net Income",
  othersTokenHolderFlows = "Others Token Holder Flows",
  incentives = "Incentives",
  earnings = "Earnings",
}
const enum FinancialStatementLabels {
  bribesRevenue = "Bribes Revenue",
}
const timeframes = ['yearly', 'quarterly', 'monthly'];
const dataKeys = {
  [AdaptorRecordType.dailyFees]: FinancialStatementRecords.grossProtocolRevenue,
  [AdaptorRecordType.dailySupplySideRevenue]: FinancialStatementRecords.costOfRevenue,
  [AdaptorRecordType.dailyRevenue]: FinancialStatementRecords.grossProfit,
  [AdaptorRecordType.dailyHoldersRevenue]: FinancialStatementRecords.tokenHolderNetIncome,
}
const methodologyKeys = {
  Fees: FinancialStatementRecords.grossProtocolRevenue,
  SupplySideRevenue: FinancialStatementRecords.costOfRevenue,
  Revenue: FinancialStatementRecords.grossProfit,
  BribesRevenue: FinancialStatementRecords.othersTokenHolderFlows,
  HoldersRevenue: FinancialStatementRecords.tokenHolderNetIncome,
  Incentives: FinancialStatementRecords.incentives,
}

function adjustDataProtocolFinancials(data: any, emissionsData: any): any {
  const aggregates: any = data.aggregates;
  const adjustedAggregates: any = {};

  if (aggregates) {
    for (const timeframe of timeframes) {
      if (aggregates[timeframe]) {
        adjustedAggregates[timeframe] = adjustedAggregates[timeframe] || {}

        for (const [timeKey, value] of Object.entries(aggregates[timeframe])) {
          adjustedAggregates[timeframe][timeKey] = adjustedAggregates[timeframe][timeKey] || {}

          for (const [dataKey, dataLabel] of Object.entries(dataKeys)) {
            adjustedAggregates[timeframe][timeKey][dataLabel] = (value as any)[dataKey]
          }
          
          // add dbr to Others Token Holder Flows
          if ((value as any)[AdaptorRecordType.dailyBribesRevenue]) {
            adjustedAggregates[timeframe][timeKey][FinancialStatementRecords.othersTokenHolderFlows] = {
              value: (value as any)[AdaptorRecordType.dailyBribesRevenue].value,
              'by-label': {
                [FinancialStatementLabels.bribesRevenue]: (value as any)[AdaptorRecordType.dailyBribesRevenue].value,
              },
            }
          }
          
          // add incentives
          if (emissionsData && emissionsData[timeframe] && emissionsData[timeframe][timeKey]) {
            adjustedAggregates[timeframe][timeKey][FinancialStatementRecords.incentives] = emissionsData[timeframe][timeKey];
          }

          // calculate Earnings = Gross Profit - Incentives
          const r = adjustedAggregates[timeframe][timeKey][FinancialStatementRecords.grossProfit]?.value || 0
          const i = adjustedAggregates[timeframe][timeKey][FinancialStatementRecords.incentives]?.value || 0
          adjustedAggregates[timeframe][timeKey][FinancialStatementRecords.earnings] = { value: r - i }
        }
      }
    }
  }
  
  // inject emission breakdownMethodology
  if (emissionsData) {
    if (emissionsData.breakdownMethodology) {
      if (!data.breakdownMethodology) data.breakdownMethodology = {};
      data.breakdownMethodology[FinancialStatementRecords.incentives] = emissionsData.breakdownMethodology;
    }
    
    if (data.childProtocols) {
      for (let i = 0; i < data.childProtocols.length; i++) {
        if (emissionsData.breakdownMethodology) {
          if (!data.childProtocols[i].breakdownMethodology) data.childProtocols[i].breakdownMethodology = {};
          data.childProtocols[i].breakdownMethodology[FinancialStatementRecords.incentives] = emissionsData.breakdownMethodology;
        }
      }
    }
  }

  // use adjusted aggregates data
  data.aggregates = adjustedAggregates;
  data.methodology = adjustMethodology(data.methodology);
  data.breakdownMethodology = adjustMethodology(data.breakdownMethodology);
  
  if (data.childProtocols) {
    for (let i = 0; i < data.childProtocols.length; i++) {
      data.childProtocols[i].methodology = adjustMethodology(data.childProtocols[i].methodology);
      data.childProtocols[i].breakdownMethodology = adjustMethodology(data.childProtocols[i].breakdownMethodology);
    }
  }

  return data;
}

function adjustMethodology(methodology: any): any {
  let adjustedMethodology: any = {}

  if (methodology) {
    for (const [key, label] of Object.entries(methodologyKeys)) {
      adjustedMethodology[label] = methodology[label] || methodology[key];
    }
  } else {
    adjustedMethodology = methodology;
  }

  return adjustedMethodology;
}

export async function generateDimensionsResponseFiles(cache: Record<AdapterType, DIMENSIONS_ADAPTER_CACHE>) {
  const dimChainsAggData: any = {}
  const dimCategoriesAggData: any = {}
  for (const adapterType of ADAPTER_TYPES) {
    const cacheData = cache[adapterType]
    const { protocolSummaries, parentProtocolSummaries, summaries } = cacheData

    const timeKey = `dimensions-gen-files ${adapterType}`
    console.time(timeKey)

    let recordTypes = getAdapterRecordTypes(adapterType)
    // store protocol summary for each record type
    const allProtocols: IJSON<PROTOCOL_SUMMARY> = { ...protocolSummaries, ...parentProtocolSummaries }
    const fileLabelsMap: any = {}

    for (const [id, protocol] of Object.entries(allProtocols)) {
      const fileLabels = getFileLabels(protocol.info ?? {})
      fileLabelsMap[id] = fileLabels


      // store aggregated data (monthly/quarterly/yearly) for fees adapter type only (all record tppes in a single file)
      if (!protocol.aggregatedRecords || adapterType !== AdapterType.FEES) continue;

      const reportData = { ...protocol.info, aggregates: protocol.aggregatedRecords }

      for (const fileLabel of fileLabels) {
        await storeRouteData(`dimensions/${adapterType}/agg-protocol/${fileLabel}`, reportData)
      }
    }

    for (const recordType of recordTypes) {
      const timeKey = `dimensions-gen-files ${adapterType} ${recordType}`
      console.time(timeKey)

      // fetch and store overview of each record type
      const allData = await getOverviewProcess({ recordType, cacheData, })
      await storeRouteData(`dimensions/${adapterType}/${recordType}-all`, allData)
      allData.totalDataChart = []
      allData.totalDataChartBreakdown = []
      await storeRouteData(`dimensions/${adapterType}/${recordType}-lite`, allData)

      // store per chain overview
      const chains = allData.allChains ?? []
      const totalDataChartByChain: any = {}

      for (const chainLabel of chains) {
        let chain = getChainKeyFromLabel(chainLabel)
        const data = await getOverviewProcess({ recordType, cacheData, chain })
        await storeRouteData(`dimensions/${adapterType}/${recordType}-chain/${chain}-all`, data)
        for (const [date, value] of data.totalDataChart) {
          totalDataChartByChain[date] = totalDataChartByChain[date] || {}
          totalDataChartByChain[date][data.chain] = value
        }
        data.totalDataChart = []
        data.totalDataChartBreakdown = []
        await storeRouteData(`dimensions/${adapterType}/${recordType}-chain/${chain}-lite`, data)

        if (!dimChainsAggData[chain]) dimChainsAggData[chain] = {}
        if (!dimChainsAggData[chain][adapterType]) dimChainsAggData[chain][adapterType] = {}
        dimChainsAggData[chain][adapterType][recordType] = {
          '24h': data.total24h,
          '7d': data.total7d,
          '30d': data.total30d,
        }
      }

      // sort by date
      await storeRouteData(`dimensions/${adapterType}/${recordType}/chain-total-data-chart`, Object.entries(totalDataChartByChain).map(([date, value]) => ([+date, value])).sort(([a]: any, [b]: any) => a - b))
      
      //
      // store per category data
      //

      if (summaries && summaries[recordType] && summaries[recordType].categorySummary) {
        for (const [category, categorySummary] of Object.entries(summaries[recordType].categorySummary)) {
          const categorySlug = sluggifyCategoryString(category); // convert to slug Dexs -> dexs
          const categoryData = await getCategoryData({ recordType, cacheData, category: category });
          await storeRouteData(`dimensions/${adapterType}/${recordType}-category/${categorySlug}-chart`, categoryData.totalDataChart);
          await storeRouteData(`dimensions/${adapterType}/${recordType}-category/${categorySlug}-chart-protocol-breakdown`, categoryData.totalDataChartBreakdown);
          await storeRouteData(`dimensions/${adapterType}/${recordType}-category/${categorySlug}`, { ...categoryData, totalDataChart: undefined, totalDataChartBreakdown: undefined });
          
          dimCategoriesAggData[category] = dimCategoriesAggData[category] || { chains: {} };
          dimCategoriesAggData[category][adapterType] = dimCategoriesAggData[category][adapterType] || {};
          dimCategoriesAggData[category][adapterType][recordType] = dimCategoriesAggData[category][adapterType][recordType] || { '24h': 0, '7d': 0, '30d': 0 };
          dimCategoriesAggData[category][adapterType][recordType]['24h'] += categoryData.total24h;
          dimCategoriesAggData[category][adapterType][recordType]['7d'] += categoryData.total7d;
          dimCategoriesAggData[category][adapterType][recordType]['30d'] += categoryData.total30d;
          
          // store category data per chain
          const chartPerChainItems: Record<string, any> = {};
          for (const chain of Object.keys(categorySummary.chainSummary ?? {})) {
            const chainLabel = getChainLabelFromKey(chain);
            const categoryChainData = await getCategoryData({ recordType, cacheData, category: category, chain });
            await storeRouteData(`dimensions/${adapterType}/${recordType}-category/${categorySlug}-chain/${chain}-chart`, categoryChainData.totalDataChart);
            await storeRouteData(`dimensions/${adapterType}/${recordType}-category/${categorySlug}-chain/${chain}-chart-protocol-breakdown`, categoryChainData.totalDataChartBreakdown);
            await storeRouteData(`dimensions/${adapterType}/${recordType}-category/${categorySlug}-chain/${chain}`, { ...categoryChainData, totalDataChart: undefined, totalDataChartBreakdown: undefined });
            
            for (const [timestamp, value] of categoryChainData.totalDataChart) {
              chartPerChainItems[timestamp] = chartPerChainItems[timestamp] || {};
              chartPerChainItems[timestamp][chainLabel] = (chartPerChainItems[timestamp][chainLabel] ?? 0) + value;
            }
            
            dimCategoriesAggData[category].chains[chain] = dimCategoriesAggData[category].chains[chain] || {};
            dimCategoriesAggData[category].chains[chain][adapterType] = dimCategoriesAggData[category].chains[chain][adapterType] || {};
            dimCategoriesAggData[category].chains[chain][adapterType][recordType] = dimCategoriesAggData[category].chains[chain][adapterType][recordType] || { '24h': 0, '7d': 0, '30d': 0 };
            dimCategoriesAggData[category].chains[chain][adapterType][recordType]['24h'] += categoryChainData.total24h;
            dimCategoriesAggData[category].chains[chain][adapterType][recordType]['7d'] += categoryChainData.total7d;
            dimCategoriesAggData[category].chains[chain][adapterType][recordType]['30d'] += categoryChainData.total30d;
          }
          
          // store category chart breakdown per chain
          await storeRouteData(`dimensions/${adapterType}/${recordType}-category/${categorySlug}-chart-chain-breakdown`, formatChartData(chartPerChainItems));
        }
      }

      //
      // store protocols data
      //

      for (let [id, protocol] of Object.entries(allProtocols) as any) {
        if (!protocol.info) {
          console.log('no info for protocol', id)
          continue
        }

        if (!protocol.dataTypes?.has(recordType)) continue; // skip if the protocol does not have data for this record type

        const data = await getProtocolDataHandler({ recordType, protocolData: protocol })

        if (!data.totalDataChart?.length) continue; // skip if there is no data

        const fileLabels = fileLabelsMap[id] ?? []
        if (!fileLabels.length) { // code should never reach here (in theory)
          console.warn('no file label found for protocol', id, protocol.info?.name)
          continue;
        }

        // store v2 data for protocols
        for (const fileLabel of fileLabels)
          await storeProtocolRouteV2Data(adapterType, recordType, fileLabel, data);

        for (const fileLabel of fileLabels)
          await storeRouteData(`dimensions/${adapterType}/${recordType}-protocol/${fileLabel}-bl`, data)

        delete data.labelBreakdownChart

        for (const fileLabel of fileLabels)
          await storeRouteData(`dimensions/${adapterType}/${recordType}-protocol/${fileLabel}-all`, data)

        data.totalDataChart = []
        data.totalDataChartBreakdown = []

        for (const fileLabel of fileLabels) {
          await storeRouteData(`dimensions/${adapterType}/${recordType}-protocol/${fileLabel}-lite`, data)

        }
      }
    }

    // console.timeEnd(timeKey)
  }
  await storeRouteData(`dimensions/chain-agg-data`, dimChainsAggData)
  await storeRouteData(`dimensions/category-agg-data`, dimCategoriesAggData)

  function getFileLabels(data: any) {
    const names = [data.name]
    if (Array.isArray(data.previousNames)) names.push(...data.previousNames)
    return [...new Set(names.map(sluggifyString))]
  }
}

async function storeProtocolRouteV2Data(adapterType: AdapterType, recordType: string, fileLabel: string, data: any) {
  if (data.totalDataChartBreakdown) {
    const chartChainBreakdown: Array<any> = []; // for chart-chain-breakdown
    const chartVersionBreakdown: Array<any> = []; // for chart-version-breakdown
    for (const [timestamp, itemChains] of data.totalDataChartBreakdown) {
      if (!itemChains) continue;
      const chainItem: any = {}
      const versionItem: any = {}
      for (const [chain, versions] of Object.entries(itemChains)) {
        chainItem[chain] = chainItem[chain] || 0
        for (const [version, value] of Object.entries(versions as any)) {
          chainItem[chain] += value;
          
          versionItem[version] = versionItem[version] || 0;
          versionItem[version] += value;
        }
      }
      chartChainBreakdown.push([Number(timestamp), chainItem])
      chartVersionBreakdown.push([Number(timestamp), versionItem])
    }
    await storeRouteData(`dimensions/${adapterType}/${recordType}-protocol/${fileLabel}-chart-chain-breakdown`, chartChainBreakdown);
    await storeRouteData(`dimensions/${adapterType}/${recordType}-protocol/${fileLabel}-chart-version-breakdown`, chartVersionBreakdown);
  }
  
  // for chart-label-breakdown
  if (data.hasLabelBreakdown) {
    await storeRouteData(`dimensions/${adapterType}/${recordType}-protocol/${fileLabel}-chart-label-breakdown`, data.labelBreakdownChart);
  }
  
  // for total chart
  await storeRouteData(`dimensions/${adapterType}/${recordType}-protocol/${fileLabel}-chart`, data.totalDataChart);
}
