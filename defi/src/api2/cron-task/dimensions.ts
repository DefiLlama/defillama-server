import '../utils/failOnError';
require("dotenv").config();

import { IJSON, AdapterType, ProtocolType, } from "../../adaptors/data/types"
import loadAdaptorsData from "../../adaptors/data"
import { getAllItemsUpdatedAfter } from "../../adaptors/db-utils/db2";
import { getDisplayChainNameCached, } from "../../adaptors/utils/getAllChainsFromAdaptors";
import { protocolsById } from "../../protocols/data";
import { parentProtocolsById } from "../../protocols/parentProtocols";
import { addAggregateRecords, getDimensionsCacheV2, storeDimensionsCacheV2, storeDimensionsMetadata, transformDimensionRecord, } from "../utils/dimensionsUtils";
import { getNextTimeS, getTimeSDaysAgo, getUnixTimeNow, timeSToUnix, unixTimeToTimeS } from "../utils/time";

import { runWithRuntimeLogging, cronNotifyOnDiscord } from "../utils";
import * as sdk from '@defillama/sdk'

import { generateDimensionsResponseFiles } from "../routes/dimensions"

import { ACCOMULATIVE_ADAPTOR_TYPE, ADAPTER_TYPES, AdaptorRecordType, DIMENSIONS_ADAPTER_CACHE, DimensionsDataRecordMap, ProtocolAdaptor, ProtocolSummary, RecordSummary, getAdapterRecordTypes, } from '../../adaptors/data/types';
import { sendMessage } from '../../utils/discord';

const blacklistedAppCategorySet = new Set([
  "Stablecoin Issuer", "MEV",
  "Liquid Staking",
])
const blacklistedAppIdSet = new Set([
  '4695', // bloXroute
])

function getProtocolAppMetricsFlag(info: any) {
  if (info.protocolType && info.protocolType !== ProtocolType.PROTOCOL) return false
  if (info.category && blacklistedAppCategorySet.has(info.category!)) return false
  let id = info.id2 ?? info.id
  if (id && blacklistedAppIdSet.has(info.id2)) return false
  return true
}

function getTimeData(moveADayBack = false) {

  const lastTimeString = getTimeSDaysAgo(0, moveADayBack)
  const dayBeforeLastTimeString = getTimeSDaysAgo(1, moveADayBack)
  const weekAgoTimeString = getTimeSDaysAgo(7, moveADayBack)
  const monthAgoTimeString = getTimeSDaysAgo(30, moveADayBack)
  const lastWeekTimeStrings = new Set(Array.from({ length: 7 }, (_, i) => getTimeSDaysAgo(i, moveADayBack)))
  const lastTwoWeektoLastWeekTimeStrings = new Set(Array.from({ length: 7 }, (_, i) => getTimeSDaysAgo(i + 7, moveADayBack)))
  const lastTwoWeekTimeStrings = new Set(Array.from({ length: 14 }, (_, i) => getTimeSDaysAgo(i, moveADayBack)))
  const last30DaysTimeStrings = new Set(Array.from({ length: 30 }, (_, i) => getTimeSDaysAgo(i, moveADayBack)))
  const last60to30DaysTimeStrings = new Set(Array.from({ length: 30 }, (_, i) => getTimeSDaysAgo(i + 30, moveADayBack)))
  const lastOneYearTimeStrings = new Set(Array.from({ length: 365 }, (_, i) => getTimeSDaysAgo(i, moveADayBack)))
  return { lastTimeString, dayBeforeLastTimeString, weekAgoTimeString, monthAgoTimeString, lastWeekTimeStrings, lastTwoWeektoLastWeekTimeStrings, lastTwoWeekTimeStrings, last30DaysTimeStrings, last60to30DaysTimeStrings, lastOneYearTimeStrings }
}

const timeData = {
  today: getTimeData(),
  yesterday: getTimeData(true),
}

async function run() {
  // Go over all types
  const allCache = await getDimensionsCacheV2() as Record<AdapterType, DIMENSIONS_ADAPTER_CACHE>

  await Promise.all(ADAPTER_TYPES.map(updateAdapterData))
  await storeDimensionsCacheV2(allCache) // store the updated cache

  // generate summaries for all types
  ADAPTER_TYPES.map(generateSummaries)

  if (NOTIFY_ON_DISCORD && process.env.DIM_ERROR_CHANNEL_WEBHOOK) {
    if (spikeRecords.length) {
      await sendMessage(`
        Spikes detected and removed:
      ${spikeRecords.join('\n')}
        `, process.env.DIM_ERROR_CHANNEL_WEBHOOK!)
    }
    if (invalidDataRecords.length) {
      await sendMessage(`
        Invalid records detected and removed:
      ${invalidDataRecords.join('\n')}
        `, process.env.DIM_ERROR_CHANNEL_WEBHOOK!)
    }
  }

  // store what all metrics are available for each protocol
  const protocolSummaryMetadata: { [key: string]: Set<string> } = {}

  Object.keys(allCache).forEach((key) => {

    const { protocolSummaries = {}, parentProtocolSummaries = {} } = allCache[key as AdapterType] as DIMENSIONS_ADAPTER_CACHE

    const addProtocol = (protocolId: any) => {
      const { summaries = {} }: any = protocolSummaries[protocolId] ?? parentProtocolSummaries[protocolId] ?? ({} as any)
      Object.keys(summaries).forEach((summaryKey) => {
        if (!summaries[summaryKey]?.totalAllTime) return;
        if (!protocolSummaryMetadata[protocolId]) protocolSummaryMetadata[protocolId] = new Set()
        protocolSummaryMetadata[protocolId].add(summaryKey)
      })
    }

    Object.keys(protocolSummaries).forEach(addProtocol)
    Object.keys(parentProtocolSummaries).forEach(addProtocol)
  })

  const protocolSummaryMetadataArray: any = {}
  Object.entries(protocolSummaryMetadata).map(([key, value]) => protocolSummaryMetadataArray[key] = Array.from(value))
  await storeDimensionsMetadata(protocolSummaryMetadataArray)

  // // store the data as files to be used by the rest api
  await generateDimensionsResponseFiles(allCache)

  async function updateAdapterData(adapterType: AdapterType) {
    // if (adapterType !== AdapterType.DERIVATIVES) return;

    const initializeCache = !allCache[adapterType] || !Object.keys(allCache[adapterType]).length
    if (initializeCache) allCache[adapterType] = {
      lastUpdated: 0,
      protocols: {},
    }
    const adapterData = allCache[adapterType]

    await pullChangedFromDBAndAddToCache()

    async function pullChangedFromDBAndAddToCache() {
      let lastUpdated = allCache[adapterType].lastUpdated ? allCache[adapterType].lastUpdated - 1 * 60 * 60 : 0 // 1 hour ago

      const results = await getAllItemsUpdatedAfter({ adapterType, timestamp: lastUpdated, transform: transformDimensionRecord })

      results.forEach((result: any) => {
        if (!result) return;
        const { id, finalRecord, timeS } = result

        // init protocol if needed
        if (!adapterData.protocols[id]) adapterData.protocols[id] = { records: {} }
        const protocolData = adapterData.protocols[id]

        // if (finalRecord.bl) protocolData.hasBreakdownData = true
        protocolData.records[timeS] = finalRecord
      })

      // remove empty records at the start of each protocol
      // commented out as we want to retain empty records
      // Object.keys(adapterData.protocols).forEach(removeEmptyRecordsAtStart)

      function removeEmptyRecordsAtStart(protocolId: any) {
        const records = adapterData.protocols[protocolId]?.records
        if (!records) return;
        // console.log('trying for protocol', protocolId, 'adapterType', adapterType, 'records', Object.keys(records).length)
        const days = Object.keys(records).sort()

        if (days.length < 2) return; // we need at least 2 days of data to do anything
        days.pop(); // we want to maintain the latest data even if it is zero

        let foundDayWithData = false
        let deleteCount = 0
        days.forEach((day) => {
          if (foundDayWithData) return;
          let totalValue = 0
          Object.entries(records[day]?.aggObject).forEach(([_recordType, dataObject]) => {
            const { value = 0 } = dataObject ?? {}
            if (value && !isNaN(+value)) totalValue += +value
          })

          if (totalValue === 0) {
            // delete records[day]
            deleteCount++
          } else {
            // console.log('found day with data', day, 'totalValue', totalValue)
            foundDayWithData = true
          }
        })

        if (deleteCount) {
          // console.log(adapterType, 'Deleting', deleteCount, 'out of', days.length + 1, 'days of data for protocol', protocolId)
        }
      }

      adapterData.lastUpdated = getUnixTimeNow()
    }
  }

  function generateSummaries(adapterType: AdapterType) {
    const timeKey1 = `data load ${adapterType}`

    const recordTypes = getAdapterRecordTypes(adapterType)

    console.time(timeKey1)
    let { protocolMap: dimensionProtocolMap } = loadAdaptorsData(adapterType)
    // console.timeEnd(timeKey1)

    const adapterData = allCache[adapterType]
    const timeKey3 = `summary ${adapterType}`

    console.time(timeKey3)

    const protocolSummaries = {} as any
    const parentProtocolSummaries = {} as any
    const summaries = {} as Record<AdaptorRecordType, RecordSummary>
    const chainMappingToVal = {} as {
      [chain: string]: number
    }
    const parentProtocolsData: { [id: string]: any } = {}
    adapterData.protocolSummaries = protocolSummaries
    adapterData.parentProtocolSummaries = parentProtocolSummaries

    for (const [_dimensionProtocolId, dimensionProtocolInfo] of Object.entries(dimensionProtocolMap) as any) {
      const hasAppMetrics = adapterType === AdapterType.FEES && getProtocolAppMetricsFlag(dimensionProtocolInfo)
      addProtocolData({ protocolId: dimensionProtocolInfo.id2, dimensionProtocolInfo, isParentProtocol: false, adapterType, skipChainSummary: false, hasAppMetrics, })
    }

    for (const entry of Object.entries(parentProtocolsData)) {
      const [parentId, item = {}] = entry as any
      const { info, childProtocols } = item as any
      if (!parentId || !info || !childProtocols) {
        console.log('parentId or info or childProtocols is missing', parentId, info, childProtocols)
        continue;
      }
      const parentProtocol: any = { info, }
      const childDimensionsInfo = childProtocols.map((child: any) => dimensionProtocolMap[child.info.id2] ?? dimensionProtocolMap[child.info.id]).map((i: any) => i)

      mergeChildRecords(parentProtocol, childProtocols)
      addProtocolData({
        protocolId: parentId, dimensionProtocolInfo: {
          ...info,
          genuineSpikes: mergeSpikeConfigs(childDimensionsInfo)
        }, isParentProtocol: true, adapterType, skipChainSummary: true, records: parentProtocol.records
      }) // compute summary data
    }

    adapterData.summaries = summaries
    adapterData.allChains = Object.keys(chainMappingToVal).sort((a, b) => chainMappingToVal[b] - chainMappingToVal[a])
    adapterData.lastUpdated = getUnixTimeNow()
    // console.timeEnd(timeKey3)

    function addProtocolData({ protocolId, dimensionProtocolInfo = ({} as any), isParentProtocol = false, adapterType, skipChainSummary = false, records, hasAppMetrics = false, }: { isParentProtocol: boolean, adapterType: AdapterType, skipChainSummary: boolean, records?: any, protocolId: string, dimensionProtocolInfo?: ProtocolAdaptor, hasAppMetrics?: boolean }) {

      if (isParentProtocol) skipChainSummary = true
      if (dimensionProtocolInfo.doublecounted) skipChainSummary = true

      if (!protocolId) {
        console.log('protocolId is missing', dimensionProtocolInfo)
        return;
      }
      // in the case of chains (like chain fees/revenue), we store records in with id2 field instead of id, maybe for all cases?
      const dimensionProtocolId = dimensionProtocolInfo.protocolType === ProtocolType.CHAIN ? protocolId : dimensionProtocolInfo.id // this need not match the protocolId, like in the case of child protocol in breakdown adapter
      const tvlProtocolInfo = protocolsById[protocolId] ?? parentProtocolsById[protocolId]
      const knownBadIds = new Set(['1', 'smbswap'])
      if (!tvlProtocolInfo && !knownBadIds.has(protocolId) && !protocolId?.startsWith('chain#')) {
        console.log('Unable to find protocol in data.ts', protocolId, dimensionProtocolInfo?.name, isParentProtocol, adapterType)
      }
      const info = { ...dimensionProtocolInfo }
      // console.log('Processing', protocolMap[id].displayName, Object.values(adapterData.protocols[id].records).length, 'records')
      const protocol = {} as any
      const protocolName = tvlProtocolInfo?.name ?? info.name ?? info.displayName
      const protocolData: any = {}
      protocol.summaries = {} as any
      protocol.info = { ...(tvlProtocolInfo ?? {}), };
      protocol.misc = {};
      protocol.dataTypes = new Set()
      const infoKeys = ['name', 'defillamaId', 'displayName', 'module', 'category', 'logo', 'chains', 'methodologyURL', 'methodology', 'gecko_id', 'forkedFrom', 'twitter', 'audits', 'description', 'address', 'url', 'audit_links', 'cmcId', 'id', 'github', 'governanceID', 'treasury', 'parentProtocol', 'previousNames', 'hallmarks', 'defaultChartView', 'doublecounted', 'breakdownMethodology',]

      infoKeys.forEach(key => protocol.info[key] = (info as any)[key] ?? protocol.info[key] ?? null)

      // while fetching child data try to dimensions metadata if it exists else protocol metadata (comes from data.ts)
      if (info.childProtocols?.length) protocol.info.childProtocols = info.childProtocols.map((child: any) => {
        const res: any = {}
        const childDimData: any = (loadAdaptorsData(adapterType) as any).protocolMap?.[child.id]
        infoKeys.forEach(key => res[key] = childDimData?.[key] ?? (child as any)[key])
        return res
      })
      if (tvlProtocolInfo?.id) protocol.info.id = tvlProtocolInfo?.id
      protocol.info.slug = protocol.info.name?.toLowerCase().replace(/ /g, '-')
      protocol.info.protocolType = info.protocolType ?? ProtocolType.PROTOCOL
      protocol.info.chains = (info.chains ?? []).map(getDisplayChainNameCached)
      protocol.info.defillamaId = protocol.info.defillamaId ?? info.id
      protocol.info.displayName = protocol.info.displayName ?? info.name ?? protocol.info.name
      const adapterTypeRecords = adapterData.protocols[dimensionProtocolId]?.records ?? {}

      const isBreakdownAdapter = !isParentProtocol && (dimensionProtocolInfo?.childProtocols ?? []).length > 0

      if (protocol.info.protocolType === ProtocolType.CHAIN) skipChainSummary = true

      if (!records)
        records = adapterTypeRecords

      if (isBreakdownAdapter) {
        console.log('Fix this code should not reach here, there are no more breakdown adapters')
        return;
      }

      protocol.records = records

      // compute & add monthly/quarterly/annual aggregate records
      addAggregateRecords(protocol)


      const protocolRecordMapWithMissingData = getProtocolRecordMapWithMissingData({ records, info: protocol.info, adapterType, metadata: dimensionProtocolInfo }) as any
      // const hasTodayData = !!protocol.records[todayTimestring]
      // const timeDataKey = hasTodayData ? 'today' : 'yesterday'
      const timeDataKey = 'yesterday' // we always use yesterday data for now, reason being we dont have have real time data for a lot of protocols
      const { lastTimeString, dayBeforeLastTimeString, weekAgoTimeString, monthAgoTimeString, lastWeekTimeStrings, lastTwoWeektoLastWeekTimeStrings, lastTwoWeekTimeStrings, last30DaysTimeStrings, last60to30DaysTimeStrings, lastOneYearTimeStrings } = timeData[timeDataKey]

      Object.entries(protocolRecordMapWithMissingData).forEach(addRecord as any)

      function addRecord([timeS, record]: [string, { timestamp: number, aggObject: DimensionsDataRecordMap }]) {
        // we dont create summary for items in protocols instead use the fetched records for others
        let { aggObject, timestamp } = record
        // const timestamp = timeSToUnix(timeS)
        // if (timestamp > startOfDayTimestamp) return; // skip today's data


        Object.entries(aggObject).forEach(addRecordData as any)

        if (hasAppMetrics) {
          const dailyFeesData = aggObject[AdaptorRecordType.dailyFees]
          const dailyRevenueData = aggObject[AdaptorRecordType.dailyRevenue]

          if (dailyFeesData) addRecordData([AdaptorRecordType.dailyAppFees, dailyFeesData])
          if (dailyRevenueData) addRecordData([AdaptorRecordType.dailyAppRevenue, dailyRevenueData])
        }

        function addRecordData([recordType, recordData]: [AdaptorRecordType, any]) {
          let { chains, value } = recordData
          // if (value === 0) return; // skip zero values

          if (!summaries[recordType]) summaries[recordType] = initSummaryItem()
          if (!protocolData[recordType]) protocolData[recordType] = initProtocolDataItem()

          const summary = summaries[recordType] as RecordSummary
          const protocolRecord = protocolData[recordType]
          if (!summary.earliestTimestamp || timestamp < summary.earliestTimestamp) summary.earliestTimestamp = timestamp

          if (!skipChainSummary) {

            if (!summary.chart[timeS]) {
              summary.chart[timeS] = 0
              summary.chartBreakdown[timeS] = {}
            }

            summary.chart[timeS] += value
            summary.chartBreakdown[timeS][protocolName] = value
          }

          if (timestamp > protocolRecord.latestTimestamp) {
            protocolRecord.latest = record
            protocolRecord.latestTimestamp = timestamp
          }

          if (timeS === lastTimeString) {
            // summary.total24h += value
            protocolRecord.today = record
          } else if (timeS === dayBeforeLastTimeString) {
            // summary.total48hto24h += value
            protocolRecord.yesterday = record
          } else if (timeS === weekAgoTimeString) {
            protocolRecord.sevenDaysAgo = record
          } else if (timeS === monthAgoTimeString) {
            protocolRecord.thirtyDaysAgo = record
          }

          if (lastWeekTimeStrings.has(timeS))
            protocolRecord.lastWeekData.push(recordData)
          if (lastTwoWeektoLastWeekTimeStrings.has(timeS))
            protocolRecord.lastTwoWeekToOneWeekData.push(recordData)
          if (lastTwoWeekTimeStrings.has(timeS))
            protocolRecord.lastTwoWeekData.push(recordData)
          if (last30DaysTimeStrings.has(timeS))
            protocolRecord.last30DaysData.push(recordData)
          if (last60to30DaysTimeStrings.has(timeS))
            protocolRecord.last60to30DaysData.push(recordData)
          if (lastOneYearTimeStrings.has(timeS))
            protocolRecord.lastOneYearData.push(recordData)

          Object.entries(chains).forEach(([chain, value]: any) => {
            if (skipChainSummary) return;
            if (!value) return; // skip zero values
            if (!summary.chainSummary![chain])
              summary.chainSummary![chain] = initSummaryItem(true)
            const chainSummary = summary.chainSummary![chain]

            if (!chainSummary.earliestTimestamp || timestamp < chainSummary.earliestTimestamp)
              chainSummary.earliestTimestamp = timestamp

            chainSummary.chart[timeS] = (chainSummary.chart[timeS] ?? 0) + value
            if (!chainSummary.chartBreakdown[timeS]) chainSummary.chartBreakdown[timeS] = {}
            chainSummary.chartBreakdown[timeS][protocolName] = value
          })
        }
      }

      for (const recordType of recordTypes) {

        let _protocolData = protocolData[recordType]
        if (!_protocolData) continue
        let todayRecord = _protocolData.today
        let yesterdayRecord = _protocolData.yesterday
        let protocolLatestRecord = undefined

        // sometimes like immediately after midnight, we still wont have today's data, if we have previous day's data, use that
        if (!todayRecord && yesterdayRecord) 
          todayRecord = yesterdayRecord

        // all summary data is computed using records upto yesterday, but to show past 24h data we need to use today's data if it exists, so we are doing this hack
        if (_protocolData.latest && todayRecord && _protocolData.latest.timestamp > todayRecord.timestamp) {
          // console.log('Using latest record for today', protocolId, protocolName, _protocolData.latest.timestamp, todayRecord.timestamp, protocolLatestRecord)
          protocolLatestRecord = _protocolData.latest
        }
        const protocolSummary = initSummaryItem() as ProtocolSummary
        protocol.summaries[recordType] = protocolSummary
        let recordLabel = recordType
        if (recordType === AdaptorRecordType.dailyAppFees) recordLabel = AdaptorRecordType.dailyFees
        if (recordType === AdaptorRecordType.dailyAppRevenue) recordLabel = AdaptorRecordType.dailyRevenue

        const debugParams = { protocolId, }
        addToSummary({ record: todayRecord?.aggObject[recordLabel], summaryKey: 'total24h', recordType, protocolSummary, skipChainSummary, protocolLatestRecord: protocolLatestRecord?.aggObject[recordLabel], debugParams, })
        addToSummary({ record: yesterdayRecord?.aggObject[recordLabel], summaryKey: 'total48hto24h', recordType, protocolSummary, skipChainSummary, debugParams, })
        addToSummary({ record: _protocolData.sevenDaysAgo?.aggObject[recordType], summaryKey: 'total7DaysAgo', recordType, protocolSummary, skipChainSummary, debugParams, })
        addToSummary({ record: _protocolData.thirtyDaysAgo?.aggObject[recordType], summaryKey: 'total30DaysAgo', recordType, protocolSummary, skipChainSummary, debugParams, })
        addToSummary({ records: _protocolData.lastWeekData, summaryKey: 'total7d', recordType, protocolSummary, skipChainSummary, debugParams, })
        // addToSummary({ records: _protocolData.lastTwoWeekData, summaryKey: 'total14d', recordType, protocolSummary, skipChainSummary, debugParams, })
        addToSummary({ records: _protocolData.lastTwoWeekToOneWeekData, summaryKey: 'total14dto7d', recordType, protocolSummary, skipChainSummary, debugParams, })
        addToSummary({ records: _protocolData.last30DaysData, summaryKey: 'total30d', recordType, protocolSummary, skipChainSummary, debugParams, })
        addToSummary({ records: _protocolData.last60to30DaysData, summaryKey: 'total60dto30d', recordType, protocolSummary, skipChainSummary, debugParams, })
        addToSummary({ records: _protocolData.lastOneYearData, summaryKey: 'total1y', recordType, protocolSummary, skipChainSummary, debugParams, })

        // add record count
        const allKeys = Object.keys(protocol.records)
        allKeys.forEach((timeS: string) => {
          const { aggObject } = protocol.records[timeS]
          if (!aggObject[recordType]) return;
          protocolSummary.recordCount++
          const { chains } = aggObject[recordType]
          Object.entries(chains).forEach(([chain]: any) => {
            if (!protocolSummary.chainSummary![chain]) protocolSummary.chainSummary![chain] = initSummaryItem(true)
            const chainSummary = protocolSummary.chainSummary![chain] as ProtocolSummary
            chainSummary.recordCount++
          })
        })

        // totalAllTime
        const acumulativeRecordType = ACCOMULATIVE_ADAPTOR_TYPE[recordType]
        if (acumulativeRecordType) {
          const allKeys = Object.keys(protocol.records)
          allKeys.sort() // this is to ensure that we are processing the records in order
          allKeys.forEach((timeS: string, idx: number) => {
            const { aggObject } = protocol.records[timeS]
            if (!aggObject[recordType]) return;
            const { value, chains } = aggObject[recordType]
            // if are not tracking the protocol's data from it's launch
            // we accept the accumulative record as the total value if it exists in the first 10 records
            // else, we dont trust the accumulative record and compute it using daily data
            // const canUseAccumulativeRecord = idx < 10
            let accumulativeRecord = { value: 0, chains: {} }

            // we do it the hard way, compute this from daily data, if the daily data is missing, find a way to get it to the db
            // if (canUseAccumulativeRecord && aggObject[acumulativeRecordType])
            //   accumulativeRecord = aggObject[acumulativeRecordType]

            const { value: totalValue, chains: chainsTotal = {} } = accumulativeRecord

            if (!protocolSummary.totalAllTime) protocolSummary.totalAllTime = 0
            protocolSummary.totalAllTime += value

            if (totalValue)
              protocolSummary.totalAllTime = totalValue

            Object.entries(chains).forEach(([chain, value]: any) => {
              if (!protocolSummary.chainSummary![chain]) protocolSummary.chainSummary![chain] = initSummaryItem(true)
              const chainSummary = protocolSummary.chainSummary![chain] as ProtocolSummary
              if (!chainSummary.totalAllTime) chainSummary.totalAllTime = 0
              chainSummary.totalAllTime += value
              if ((chainsTotal as any)[chain])
                chainSummary.totalAllTime = (chainsTotal as any)[chain]
            })
          })
        }

        // average1y
        protocolSummaryAction(protocolSummary, (summary: any) => {
          if (summary.total1y && _protocolData.lastOneYearData?.length > 0) {
            summary.average1y = summary.total1y / _protocolData.lastOneYearData.length
          }
        });
        // monthlyAverage1y
        protocolSummaryAction(protocolSummary, (summary: any) => {
          if (summary.total1y && _protocolData.lastOneYearData?.length >= 30) {
            summary.monthlyAverage1y = (summary.total1y / _protocolData.lastOneYearData.length) * 30.44
          }
        });
        // change_1d
        protocolSummaryAction(protocolSummary, (summary: any) => {
          if (typeof summary.total24h === 'number' && typeof summary.total48hto24h === 'number' && summary.total48hto24h !== 0)
            summary.change_1d = getPercentage(summary.total24h, summary.total48hto24h)
        })
        // change_7d
        protocolSummaryAction(protocolSummary, (summary: any) => {
          if (typeof summary.total24h === 'number' && typeof summary.total7DaysAgo === 'number' && summary.total7DaysAgo !== 0)
            summary.change_7d = getPercentage(summary.total24h, summary.total7DaysAgo)
        })
        // change_1m
        protocolSummaryAction(protocolSummary, (summary: any) => {
          if (typeof summary.total24h === 'number' && typeof summary.total30DaysAgo === 'number' && summary.total30DaysAgo !== 0)
            summary.change_1m = getPercentage(summary.total24h, summary.total30DaysAgo)
        })
        // change_7dover7d
        protocolSummaryAction(protocolSummary, (summary: any) => {
          if (typeof summary.total7d === 'number' && typeof summary.total14dto7d === 'number' && summary.total14dto7d !== 0)
            summary.change_7dover7d = getPercentage(summary.total7d, summary.total14dto7d)
        })
        // change_30dover30d
        protocolSummaryAction(protocolSummary, (summary: any) => {
          if (typeof summary.total30d === 'number' && typeof summary.total60dto30d === 'number' && summary.total60dto30d !== 0)
            summary.change_30dover30d = getPercentage(summary.total30d, summary.total60dto30d)
        })

        // breakdown24h
        protocolSummary.breakdown24h = null
        protocolSummary.breakdown30d = null

        addBreakdownData({ recordType, record: todayRecord, storeKey: 'breakdown24h', skipChainSummary: false })
        addBreakdownData({ recordType, records: _protocolData.last30DaysData, storeKey: 'breakdown30d' })

        function addBreakdownData({ recordType, record, storeKey, skipChainSummary = true, records, }: { recordType: string, record?: any, records?: any[], storeKey: string, skipChainSummary?: boolean }) {

          if (records) {
            records.forEach((i: any) => addBreakdownData({ recordType, record: { aggObject: { [recordLabel]: i } }, storeKey, skipChainSummary }))
            return;
          }

          const { aggObject = {}, breakdown = {} } = record ?? {}

          if (aggObject[recordType]) {
            let breakdownData = Object.keys(breakdown[recordType] ?? {}).length ? breakdown[recordType] : { [protocolName]: aggObject[recordType] }
            const result: any = (protocolSummary as any)[storeKey] ?? {}
            Object.entries(breakdownData).forEach(([subModuleName, { chains }]: any) => {
              Object.entries(chains).forEach(([chain, value]: any) => {
                if (!result[chain]) result[chain] = {}
                result[chain][subModuleName] = (result[chain][subModuleName] ?? 0) + value

                if (!skipChainSummary) {
                  const chainName = getDisplayChainNameCached(chain)
                  if (chainMappingToVal[chainName] === undefined) {
                    chainMappingToVal[chainName] = 0
                  }
                  chainMappingToVal[chainName] += value
                }

              })
            });
            (protocolSummary as any)[storeKey] = result
          }
        }
      }

      if (!isParentProtocol) {
        protocolSummaries[protocolId] = protocol

        const parentId = protocol.info.parentProtocol
        if (!parentId) return;

        if (!parentProtocolsById[parentId]) {
          console.log('Parent protocol not found', parentId, protocol.info.name)
          return;
        }

        // initialize parent protocol data
        if (!parentProtocolsData[parentId])
          parentProtocolsData[parentId] = { info: parentProtocolsById[parentId], childProtocols: [] }

        parentProtocolsData[parentId].childProtocols.push(protocol)
      } else {
        parentProtocolSummaries[protocolId] = protocol
      }
    }

    function addToSummary({ record, records = [], recordType, summaryKey, chainSummaryKey, protocolSummary, skipChainSummary = false, protocolLatestRecord, debugParams, }: { records?: any[], recordType: AdaptorRecordType, summaryKey: string, chainSummaryKey?: string, record?: any, protocolSummary: any, skipChainSummary?: boolean, protocolLatestRecord?: any, debugParams?: any }) {
      // protocolLatestRecord ?? record is a hack to show latest data as protocol's 24h data but not use that record for computing chain/global summary
      if (protocolSummary) _addToSummary({ record: protocolLatestRecord ?? record, records, recordType, summaryKey, chainSummaryKey, summary: protocolSummary, debugParams, })
      // we need to skip updating summary because underlying child data is already used to update the summary
      if (!skipChainSummary) _addToSummary({ record, records, recordType, summaryKey, chainSummaryKey, debugParams })
    }
    function _addToSummary({ record, records = [], recordType, summaryKey, chainSummaryKey, summary, debugParams }: { records?: any[], recordType: AdaptorRecordType, summaryKey: string, chainSummaryKey?: string, record?: any, summary?: any, debugParams?: any }) {
      if (!chainSummaryKey) chainSummaryKey = summaryKey
      if (record) records = [record]
      if (!records?.length) return;

      if (!summary) {
        if (!summaries[recordType]) summaries[recordType] = initSummaryItem()
        summary = summaries[recordType] as any
      }

      records.forEach(({ value, chains }: { value: number, chains: IJSON<number> }) => {
        // if (!value) return;
        if (typeof value !== 'number') {
          console.log(value, chains, recordType, summaryKey, adapterType, debugParams?.protocolId, 'value is not a number')
          return;
        }
        summary[summaryKey] = (summary[summaryKey] ?? 0) + value
        Object.entries(chains).forEach(([chain, value]: any) => {
          if (!summary.chainSummary![chain]) summary.chainSummary![chain] = initSummaryItem(true)
          const chainSummary = summary.chainSummary![chain]

          if (!chainSummary[chainSummaryKey!]) chainSummary[chainSummaryKey!] = 0
          chainSummary[chainSummaryKey!] += value
        })
      })
    }

    function protocolSummaryAction(summary: ProtocolSummary, fn: any) {
      fn(summary)
      Object.entries(summary.chainSummary!).forEach(([_chain, chainSummary]: any) => {
        fn(chainSummary)
      })
    }

  }
}

function mergeChildRecords(protocol: any, childProtocolData: any[]) {
  const parentRecords: any = {}
  const { info, } = protocol
  const childProtocols = childProtocolData.map(({ info }: any) => info?.name ?? info?.displayName)


  info.linkedProtocols = [info.name].concat(childProtocols)
  info.childProtocols = []
  
  const childFieldsToCopy = ['name', 'displayName', 'defillamaId', 'methodologyURL', 'methodology', 'breakdownMethodology', 'defaultChartView', ]


  childProtocolData.forEach(({ records, info: childData }: any) => {

    // add child protocol metadata
    const childProtocolInfo = {} as ProtocolAdaptor
    childFieldsToCopy.filter(i => i !== undefined).forEach((field) => (childProtocolInfo as any)[field] = childData[field])
    info.childProtocols.push(childProtocolInfo)


    const childProtocolLabel = childData.name ?? childData.displayName
    childData.linkedProtocols = info.linkedProtocols

    if (!childProtocolLabel) console.log('childProtocolLabel is missing', childData)

    // update child  metadata and chain info
    // info.childProtocols.push({ ...childData, childProtocolLabel })
    if (!info.chains) info.chains = []
    info.chains = Array.from(new Set(info.chains.concat(childData.chains ?? [])))

    Object.entries(records).forEach(([timeS, record]: any) => {
      if (!parentRecords[timeS]) parentRecords[timeS] = { breakdown: {}, aggObject: {} }

      Object.entries(record.aggObject).forEach(([recordType, childAggData]: any) => {
        if (!parentRecords[timeS].aggObject[recordType]) parentRecords[timeS].aggObject[recordType] = { value: 0, chains: {} }
        if (!parentRecords[timeS].breakdown[recordType]) parentRecords[timeS].breakdown[recordType] = {}
        if (!parentRecords[timeS].breakdown[recordType][childProtocolLabel]) parentRecords[timeS].breakdown[recordType][childProtocolLabel] = { value: 0, chains: {} }

        const aggItem = parentRecords[timeS].aggObject[recordType]
        const breakdownItem = parentRecords[timeS].breakdown[recordType][childProtocolLabel]
        aggItem.value += childAggData.value
        breakdownItem.value = childAggData.value
        Object.entries(childAggData.chains).forEach(([chain, value]: any) => {
          aggItem.chains[chain] = (aggItem.chains[chain] ?? 0) + value
          breakdownItem.chains[chain] = value
        })

        if (childAggData.labelBreakdown) {
          if (!aggItem.labelBreakdown) aggItem.labelBreakdown = {}
          Object.entries(childAggData.labelBreakdown).forEach(([label, labelValue]: any) => {

            if (!childData.hasLabelBreakdown) childData.hasLabelBreakdown = true
            if (!info.hasLabelBreakdown) info.hasLabelBreakdown = true

            aggItem.labelBreakdown![label] = (aggItem.labelBreakdown![label] ?? 0) + labelValue
          })
        }
      })
    })
  })

  protocol.records = parentRecords
  protocol.misc = {}
  return protocol
}

function initSummaryItem(isChain = false) {
  const response: RecordSummary = {
    earliestTimestamp: undefined,
    chart: {},
    chartBreakdown: {},
    total24h: null,
    total48hto24h: null,
    chainSummary: {},
    recordCount: 0,
  }
  if (isChain)
    delete response.chainSummary
  return response
}

function initProtocolDataItem() {
  return {
    today: null,
    yesterday: null,
    sevenDaysAgo: null,
    lastWeekData: [],
    lastTwoWeekData: [],
    lastTwoWeekToOneWeekData: [],
    last30DaysData: [],
    last60DaysData: [],
    last60to30DaysData: [],
    lastOneYearData: [],
    latestTimestamp: 0,
  }
}


runWithRuntimeLogging(run, {
  application: 'cron-task',
  type: 'dimensions',
})
  // .then(storeAppMetadata) // we run this in a separate script now
  .catch(async e => {
    console.error(e)
    const errorMessage = (e as any)?.message ?? (e as any)?.stack ?? JSON.stringify(e)
    if (process.env.DIM_ERROR_CHANNEL_WEBHOOK)
      await sendMessage(errorMessage, process.env.DIM_ERROR_CHANNEL_WEBHOOK!)
  })
  .then(() => process.exit(0))

const spikeRecords = [] as any[]
const invalidDataRecords = [] as any[]

const NOTIFY_ON_DISCORD = cronNotifyOnDiscord()

// const accumulativeRecordTypeSet = new Set(Object.values(ACCOMULATIVE_ADAPTOR_TYPE))

// fill all missing data with the last available data 
// (NOTE:  we no longer copy forward missing data, but we retain the code if we want to enable it in future)
// should look into disabling this as the validation for checking spikes has been moved to data ingestion phase
function getProtocolRecordMapWithMissingData({ records, info = {}, adapterType, metadata, }: { records: IJSON<any>, info?: any, adapterType: any, metadata: any, }) {
  const { whitelistedSpikeSet = new Set() } = getSpikeConfig(metadata)
  const allKeys = Object.keys(records)

  // there is no point in maintaining accumulative data for protocols on all the records
  // we retain only the first and last record and compute the rest
  const accumRecordFirsts: IJSON<any> = {}
  const accumRecordLasts: IJSON<any> = {}

  // Disabled sorting as it is no longer required since we are not copying forward missing data
  // allKeys.sort() 


  allKeys.forEach((timeS: any, idx: number) => {
    const record = records[timeS]
    if (!record) {
      delete records[timeS]
      return;
    }
    const dataKeys = Object.keys(record.aggObject ?? {}) // we care about only base keys
    // .filter(key => ACCOMULATIVE_ADAPTOR_TYPE[key])  // moved to transform function on import from the db
    const values = dataKeys.map(key => record.aggObject?.[key]?.value ?? 0)
    const improbableValue = 2e11 // 200 billion
    if (values.some((i: any) => i > improbableValue)) {
      if (NOTIFY_ON_DISCORD)
        invalidDataRecords.push([adapterType, metadata?.id, info?.name, timeS, values.find((i: any) => i > improbableValue)].map(i => i + ' ').join(' '))
      sdk.log('Invalid value found (removing it)', adapterType, metadata?.id, info?.name, timeS, values.find((i: any) => i > improbableValue))
      delete records[timeS]
      return;
    }

    dataKeys.forEach((key: any) => {

      // code for logging spikes
      const currentValue = record.aggObject?.[key]?.value
      // we check if we have at least 7 days of data & value is higher than a million before checking if it is a spike
      if (idx > 7 && currentValue > 1e7 && !whitelistedSpikeSet.has(timeS)) {
        const surroundingKeys = getSurroundingKeysExcludingCurrent(allKeys, idx)
        const highestCloseValue = surroundingKeys.map(i => records[i]?.aggObject?.[key]?.value ?? 0).filter(i => i).reduce((a, b) => Math.max(a, b), 0)
        let isSpike = false
        if (highestCloseValue > 0) {
          let currentValueisHigh = currentValue > 1e6 // 1 million
          switch (key) {
            case 'dv':
            case 'dnv': currentValueisHigh = currentValue > 3e8; break; // 300 million
          }
          let spikeRatio = currentValueisHigh ? 5 : 10
          isSpike = currentValue > spikeRatio * highestCloseValue
        }

        if (isSpike) {
          if (NOTIFY_ON_DISCORD)
            spikeRecords.push([adapterType, metadata?.id, info?.name, timeS, timeSToUnix(timeS), key, Number(currentValue / 1e6).toFixed(2) + 'm', Number(highestCloseValue / 1e6).toFixed(2) + 'm', Math.round(currentValue * 100 / highestCloseValue) / 100 + 'x'].map(i => i + ' ').join(' '))
          sdk.log('Spike detected (removing it)', adapterType, metadata?.id, info?.name, timeS, timeSToUnix(timeS), key, Number(currentValue / 1e6).toFixed(2) + 'm', Number(highestCloseValue / 1e6).toFixed(2) + 'm', Math.round(currentValue * 100 / highestCloseValue) / 100 + 'x')
          delete records[timeS]
          return;
          // sdk.log('Spike detected', info?.name, timeS, JSON.stringify(record, null, 2))
        }
      }

      // code for removing redundant cummulative data
      /* -- moved to transform function on import from the db
       if (!accumulativeRecordTypeSet.has(key)) return;
      if (!accumRecordFirsts[key]) {
        accumRecordFirsts[key] = timeS
      } else if (!accumRecordLasts[key]) {
        accumRecordLasts[key] = timeS
      } else {
        const prevRecordWithVaule = records[accumRecordLasts[key]]
        delete prevRecordWithVaule.aggObject?.[key]
        delete prevRecordWithVaule.breakdown?.[key]
        accumRecordLasts[key] = timeS
      } 
        */
    })
  })


  // Code for filling in missing data with the last available data
  // disable it
  const isRefillEnabled = false
  if (!isRefillEnabled) return records


  let firstTimestamp: number
  let firstTimeS: string
  let lastTimeSWithData: string
  let nextTimeS: string
  // let currentTime = getStartOfTodayTime()
  let currentTime = getUnixTimeNow()
  const response: IJSON<any> = { ...records }

  Object.entries(records).forEach(([timeS, record]: any) => {
    if (!firstTimestamp || record.timestamp < firstTimestamp) {
      firstTimestamp = record.timestamp
      firstTimeS = timeS
      lastTimeSWithData = timeS
    }
  })

  if (!firstTimeS!) return {}

  nextTimeS = firstTimeS


  const fillUptoDays = 3 // we fill in data for upto 3 days
  let missingDataCounter = 0

  while (isRefillEnabled && timeSToUnix(nextTimeS) < currentTime) {
    if (records[nextTimeS]) {
      missingDataCounter = 0
      lastTimeSWithData = nextTimeS

    } else {
      missingDataCounter++
      if (missingDataCounter < fillUptoDays) {
        response[nextTimeS] = records[lastTimeSWithData!]
      }
    }

    nextTimeS = getNextTimeS(nextTimeS)
  }

  return response
}

function getPercentage(a: number, b: number) {
  return +Number(((a - b) / b) * 100).toFixed(2)
}

type SpikeConfig = {
  whitelistedSpikeSet?: Set<string>
}

function mergeSpikeConfigs(childProtocols: any[]) {
  const genuineSpikesSet = new Set<string>()
  childProtocols.forEach((childConfig: any = {}) => {
    if (Array.isArray(childConfig.genuineSpikes)) {
      childConfig.genuineSpikes.forEach((key: any) => {
        genuineSpikesSet.add(key)
      })
    }
  })
  const response = [...genuineSpikesSet]
  return response
}

function getSpikeConfig(protocol: any): SpikeConfig {
  if (!protocol?.genuineSpikes) return {}
  let info = (protocol as any)?.genuineSpikes ?? []
  const whitelistedSpikeSet = new Set(info.map(unixTimeToTimeS)) as Set<string>
  return { whitelistedSpikeSet }
}

function getSurroundingKeysExcludingCurrent<T>(array: T[], currentIndex: number, range = 7): T[] {
  const startIndex = Math.max(currentIndex - range, 0);
  const endIndex = Math.min(currentIndex + range, array.length);
  const beforeCurrent = array.slice(startIndex, currentIndex);
  const afterCurrent = array.slice(currentIndex + 1, endIndex + 1);
  return beforeCurrent.concat(afterCurrent);
}
