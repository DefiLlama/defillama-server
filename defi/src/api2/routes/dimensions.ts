
import { AdapterType, IJSON } from "../../adaptors/data/types"
import * as HyperExpress from "hyper-express";
import { CATEGORIES } from "../../adaptors/data/helpers/categories";
import { ADAPTER_TYPES, AdaptorRecordType, AdaptorRecordTypeMap, DEFAULT_CHART_BY_ADAPTOR_TYPE, DIMENSIONS_ADAPTER_CACHE, getAdapterRecordTypes, PROTOCOL_SUMMARY } from "../../adaptors/data/types";
import { formatChainKey, getDisplayChainNameCached, normalizeDimensionChainsMap } from "../../adaptors/utils/getAllChainsFromAdaptors";
import { sluggifyString } from "../../utils/sluggify";
import { readRouteData, storeRouteData } from "../cache/file-cache";
import { getTimeSDaysAgo, timeSToUnix, } from "../utils/time";
import { errorResponse, fileResponse, successResponse, validateProRequest } from "./utils";

const sluggifiedNormalizedChains: IJSON<string> = Object.keys(normalizeDimensionChainsMap).reduce((agg, chain) => ({ ...agg, [chain]: sluggifyString(chain.toLowerCase()) }), {})

function formatChartData(data: any = {}) {
  const result = [];
  for (const key in data) {
    result.push([timeSToUnix(key), data[key]]);
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
  const rawCategory = req.query_parameters.category
  const category = (rawCategory === 'dexs' ? 'dexs' : rawCategory) as CATEGORIES
  const fullChart = req.query_parameters.fullChart?.toLowerCase() === 'true'
  const dataType = rawDataType ? AdaptorRecordTypeMap[rawDataType] : DEFAULT_CHART_BY_ADAPTOR_TYPE[adaptorType]
  if (!adaptorType) throw new Error("Missing parameter")
  if (category !== undefined && !Object.values(CATEGORIES).includes(category)) throw new Error("Category not supported")

  if (!validMetricTypesSet.has(adaptorType)) throw new Error(`Adaptor ${adaptorType} not supported`)
  if (!validRecordTypesSet.has(dataType)) throw new Error("Data type not suported")

  const response: {
    adaptorType: AdapterType,
    excludeTotalDataChart: boolean,
    excludeTotalDataChartBreakdown: boolean,
    category?: CATEGORIES,
    protocolName?: string,  // applicable only for protocol routes
    chainFilter?: string,   // applicable only for summary routes
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

    const pathChain = req.path_parameters.chain?.toLowerCase()
    const chainFilterRaw = (pathChain ? decodeURI(pathChain) : pathChain)?.toLowerCase()
    response.chainFilter = sluggifiedNormalizedChains[chainFilterRaw] ?? chainFilterRaw

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
  if (chain) {
    if (chain.includes('-')) chain = chain.replace(/-/g, ' ')
    chain = formatChainKey(chain) // normalize chain name like 'zksync-era' -> 'era' 
  }
  const chainDisplayName = chain ? getDisplayChainNameCached(chain) : null
  let summary = chain ? summaries[recordType]?.chainSummary[chain] : summaries[recordType]
  const response: any = {}
  if (!summary) summary = {}

  response.totalDataChart = formatChartData(summary.chart)
  response.totalDataChartBreakdown = formatChartData(summary.chartBreakdown)
  fixChartLastRecord()

  response.breakdown24h = null
  response.breakdown30d = null
  response.chain = chain ?? null
  if (response.chain)
    response.chain = getDisplayChainNameCached(response.chain)
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

  // some protocols dont support pulling current day data (can only pull daily data after the day is complete instead of past 24 hours)
  // so we fix the last record to be the same as previous day if the last record is for today
  function fixChartLastRecord() {
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

  response.chains = response.chains?.map((chain: string) => getDisplayChainNameCached(chain))
  if (response.totalDataChartBreakdown) {
    response.totalDataChartBreakdown.forEach(([_, chart]: any) => {
      Object.entries(chart ?? {}).forEach(([chain, value]: any) => {
        delete chart[chain]
        chart[getDisplayChainNameCached(chain)] = value
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
    adaptorType, dataType, excludeTotalDataChart, excludeTotalDataChartBreakdown, chainFilter,
  } = getEventParameters(req, true)

  const isAllChainDataRequested = chainFilter?.toLowerCase() === 'chain-breakdown'

  if (isAllChainDataRequested && (req as any).isProRoute) {

    const routeFile = `dimensions/${adaptorType}/${dataType}/chain-total-data-chart`
    return fileResponse(routeFile, res)
  }

  const isLiteStr = excludeTotalDataChart && excludeTotalDataChartBreakdown ? '-lite' : '-all'
  const chainStr = chainFilter && chainFilter?.toLowerCase() !== 'all' ? `-chain/${chainFilter.toLowerCase()}` : ''
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

async function getProtocolFinancials(req: HyperExpress.Request, res: HyperExpress.Response) {
  validateProRequest(req, res)  // ensure that only pro users can access financial statement data

  const protocolSlug = sluggifyString(req.path_parameters.name?.toLowerCase())
  const routeSubPath = `${AdapterType.FEES}/agg-protocol/${protocolSlug}`
  const routeFile = `dimensions/${routeSubPath}`
  return fileResponse(routeFile, res)
}

export async function generateDimensionsResponseFiles(cache: Record<AdapterType, DIMENSIONS_ADAPTER_CACHE>) {
  const dimChainsAggData: any = {}
  for (const adapterType of ADAPTER_TYPES) {
    const cacheData = cache[adapterType]
    const { protocolSummaries, parentProtocolSummaries, } = cacheData

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
        let chain = chainLabel.toLowerCase()
        chain = sluggifiedNormalizedChains[chain] ?? chain
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

  function getFileLabels(data: any) {
    const names = [data.name]
    if (Array.isArray(data.previousNames)) names.push(...data.previousNames)
    return [...new Set(names.map(sluggifyString))]
  }
}