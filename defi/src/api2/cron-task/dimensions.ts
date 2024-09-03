import '../utils/failOnError'

import { ACCOMULATIVE_ADAPTOR_TYPE, getAdapterRecordTypes, } from "../../adaptors/handlers/getOverviewProcess";
import { IJSON, AdapterType, ProtocolType, } from "@defillama/dimension-adapters/adapters/types";
import loadAdaptorsData from "../../adaptors/data"
import { getDimensionsCacheV2, storeDimensionsCacheV2, } from "../utils/dimensionsUtils";
import { ADAPTER_TYPES } from "../../adaptors/handlers/triggerStoreAdaptorData";
import { getAllItemsUpdatedAfter } from "../../adaptors/db-utils/db2";
// import { toStartOfDay } from "../../adaptors/db-utils/AdapterRecord2";
import { getTimeSDaysAgo, getNextTimeS, getUnixTimeNow, timeSToUnix, getStartOfTodayTime, unixTimeToTimeS, } from "../utils/time";
import { getDisplayChainNameCached } from "../../adaptors/utils/getAllChainsFromAdaptors";
import { parentProtocolsById } from "../../protocols/parentProtocols";
import { protocolsById } from "../../protocols/data";

import { RUN_TYPE, roundVaules, } from "../utils";
import * as sdk from '@defillama/sdk'

import { getOverviewProcess2, getProtocolDataHandler2 } from "../routes/dimensions"
import { storeRouteData } from "../cache/file-cache"
import { normalizeDimensionChainsMap } from "../../adaptors/utils/getAllChainsFromAdaptors"
import { sluggifyString } from "../../utils/sluggify"

// const startOfDayTimestamp = toStartOfDay(new Date().getTime() / 1000)

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

const todayTimestring = getTimeSDaysAgo(0)

const timeData = {
  today: getTimeData(),
  yesterday: getTimeData(true),
}

async function run() {
  // Go over all types
  const allCache = await getDimensionsCacheV2(RUN_TYPE.CRON)
  await Promise.all(ADAPTER_TYPES.map(updateAdapterData))
  await storeDimensionsCacheV2(allCache) // store the updated cache


  const { protocolMap: protocolTypeProtocolMap } = loadAdaptorsData(AdapterType.PROTOCOLS)

  // generate summaries for all types
  ADAPTER_TYPES.map(generateSummaries)

  // // store the data as files to be used by the rest api
  await generateDimensionsResponseFiles(allCache)


  async function updateAdapterData(adapterType: AdapterType) {
    // if (adapterType !== AdapterType.AGGREGATORS) return;

    if (!allCache[adapterType]) allCache[adapterType] = {
      lastUpdated: 0,
      protocols: {},
    }
    const adapterData = allCache[adapterType]

    await pullChangedFromDBAndAddToCache()


    async function pullChangedFromDBAndAddToCache() {
      let lastUpdated = allCache[adapterType].lastUpdated ? allCache[adapterType].lastUpdated - 5 * 24 * 60 * 60 : 0 // 5 days ago
      const results = await getAllItemsUpdatedAfter({ adapterType, timestamp: lastUpdated })

      results.forEach((result: any) => {
        const { id, timestamp, data, timeS, } = result
        roundVaules(data)
        if (!adapterData.protocols[id]) adapterData.protocols[id] = {
          records: {}
        }
        adapterData.protocols[id].records[timeS] = { ...data, timestamp, }
      })
      adapterData.lastUpdated = getUnixTimeNow()
    }
  }

  function generateSummaries(adapterType: AdapterType) {
    if (adapterType === AdapterType.PROTOCOLS) return;
    const timeKey1 = `data load ${adapterType}`

    const recordTypes = getAdapterRecordTypes(adapterType)

    console.time(timeKey1)
    let { protocolMap: dimensionProtocolMap } = loadAdaptorsData(adapterType)
    console.timeEnd(timeKey1)

    // dex & fees sometimes share config & data, it is stored in AdapterType.PROTOCOLS
    const includeProtocolTypeData = [AdapterType.DEXS, AdapterType.FEES].includes(adapterType)
    let protocolRecordData = {} as any
    if (includeProtocolTypeData) {
      protocolRecordData = allCache[AdapterType.PROTOCOLS].protocols
      dimensionProtocolMap = { ...protocolTypeProtocolMap, ...dimensionProtocolMap }
    }

    const adapterData = allCache[adapterType]
    const timeKey3 = `summary ${adapterType}`


    console.time(timeKey3)

    const protocolSummaries = {} as any
    const parentProtocolSummaries = {} as any
    const summaries: IJSON<RecordSummary> = {}
    const chainSet = new Set<string>()
    const parentProtocolsData: { [id: string]: any } = {}
    adapterData.protocolSummaries = protocolSummaries
    adapterData.parentProtocolSummaries = parentProtocolSummaries


    for (const [_dimensionProtocolId, dimensionProtocolInfo] of Object.entries(dimensionProtocolMap) as any) {
      addProtocolData({ protocolId: dimensionProtocolInfo.id2, dimensionProtocolInfo, isParentProtocol: false, adapterType, skipChainSummary: false, })
    }

    for (const entry of Object.entries(parentProtocolsData)) {
      const [parentId, item = {}] = entry as any
      const { info, childProtocols } = item as any
      if (!parentId || !info || !childProtocols) {
        console.log('parentId or info or childProtocols is missing', parentId, info, childProtocols)
        continue;
      }
      const parentProtocol: any = { info, }

      mergeChildRecords(parentProtocol, childProtocols)
      addProtocolData({ protocolId: parentId, isParentProtocol: true, adapterType, skipChainSummary: true, records: parentProtocol.records }) // compute summary data
    }

    adapterData.summaries = summaries
    adapterData.allChains = Array.from(chainSet)
    adapterData.lastUpdated = getUnixTimeNow()
    console.timeEnd(timeKey3)

    function addProtocolData({ protocolId, dimensionProtocolInfo = {}, isParentProtocol = false, adapterType, skipChainSummary = false, records }: { isParentProtocol: boolean, adapterType: AdapterType, skipChainSummary: boolean, records?: any, protocolId: string, dimensionProtocolInfo?: any }) {
      if (isParentProtocol) skipChainSummary = true


      if (!protocolId) {
        console.log('protocolId is missing', dimensionProtocolInfo)
        return;
      }
      // in the case of chains (like chain fees/revenue), we store records in with id2 field instead of id, maybe for all cases?
      const dimensionProtocolId = dimensionProtocolInfo.protocolType === ProtocolType.CHAIN ? protocolId : dimensionProtocolInfo.id // this need not match the protocolId, like in the case of child protocol in breakdown adapter
      if (dimensionProtocolInfo.enabled === false) return; // we skip protocols that are disabled
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
      protocol.misc = {
        versionKey: info.versionKey,  // TODO: check, this is not stored in cache correctly and as workaround we are storing it in info object
      };
      const infoKeys = ['name', 'defillamaId', 'disabled', 'displayName', 'module', 'category', 'logo', 'chains', 'methodologyURL', 'methodology', 'gecko_id', 'forkedFrom', 'twitter', 'audits', 'description', 'address', 'url', 'audit_links', 'versionKey', 'cmcId', 'id', 'github', 'governanceID', 'treasury', 'parentProtocol']

      infoKeys.forEach(key => protocol.info[key] = (info as any)[key] ?? protocol.info[key] ?? null)
      if (info.childProtocols?.length) protocol.info.childProtocols = info.childProtocols.map((child: any) => {
        const res: any = {}
        infoKeys.forEach(key => res[key] = (child as any)[key])
        return res
      })
      if (tvlProtocolInfo?.id) protocol.info.id = tvlProtocolInfo?.id
      protocol.info.latestFetchIsOk = true
      protocol.info.slug = protocol.info.name?.toLowerCase().replace(/ /g, '-')
      protocol.info.protocolType = info.protocolType ?? ProtocolType.PROTOCOL
      protocol.info.chains = (info.chains ?? []).map(getDisplayChainNameCached)
      protocol.info.chains.forEach((chain: string) => chainSet.add(chain))
      protocol.info.defillamaId = protocol.info.defillamaId ?? info.id
      protocol.info.displayName = protocol.info.displayName ?? info.name ?? protocol.info.name
      const protocolTypeRecords = protocolRecordData[dimensionProtocolId]?.records ?? {}
      const adapterTypeRecords = adapterData.protocols[dimensionProtocolId]?.records ?? {}


      const isBreakdownAdapter = !isParentProtocol && dimensionProtocolInfo?.childProtocols?.length > 0


      if (!records)
        records = { ...adapterTypeRecords,  ...protocolTypeRecords, } // if there are duplicate records between protocol and specific adaptertype, the generic record overwrites specific record (Noticed that uniswap stores in both protocol & dex record and dex records are wrong)

      if (isBreakdownAdapter) {
        const childProtocols = dimensionProtocolInfo.childProtocols

        // generate protocol summaries for child protocols
        childProtocols.forEach((childProtocol: any) => {
          const versionKey = childProtocol.versionKey
          if (!versionKey) {
            console.log('versionKey is missing', childProtocol, dimensionProtocolInfo.name)
            return;
          }
          let childProtocolRecords = extractChildRecords({ records, versionKey })
          const uniqueChildId = childProtocol.id2

          // unlikely but covering the case if we stored child protocol records directly instead of part of breakdown adapter
          if (uniqueChildId !== dimensionProtocolId) {
            const protocolTypeRecords = protocolRecordData[uniqueChildId]?.records ?? {}
            const adapterTypeRecords = adapterData.protocols[uniqueChildId]?.records ?? {}
            // console.log(protocol.info.id, protocol.info.name, 'childProtocolRecords', Object.keys(childProtocolRecords).length, 'protocolTypeRecords', Object.keys(protocolTypeRecords).length, 'adapterTypeRecords', Object.keys(adapterTypeRecords).length, versionKey)
            childProtocolRecords = { ...protocolTypeRecords, ...adapterTypeRecords, ...childProtocolRecords }
          }
          // console.log('Processing child protocol', childProtocol.name, Object.values(childProtocolRecords).length, 'records')
          addProtocolData({ protocolId: childProtocol.id2, records: childProtocolRecords, dimensionProtocolInfo: childProtocol, isParentProtocol: false, adapterType, skipChainSummary: false, })
        })

        return;
      }
      // console.log('Processing', protocolName, Object.values(records).length, 'records')

      protocol.records = records
      const protocolRecordMapWithMissingData = getProtocolRecordMapWithMissingData({ records, info: protocol.info, adapterType, metadata: dimensionProtocolInfo })
      // console.log('protocolRecordMapWithMissingData', protocolName, Object.values(protocolRecordMapWithMissingData).length, 'records', 'skipChainSummary', skipChainSummary)
      // const hasTodayData = !!protocol.records[todayTimestring]
      // const timeDataKey = hasTodayData ? 'today' : 'yesterday'
      const timeDataKey = 'yesterday' // we always use yesterday data for now, reason being we dont have have real time data for a lot of protocols
      const { lastTimeString, dayBeforeLastTimeString, weekAgoTimeString, monthAgoTimeString, lastWeekTimeStrings, lastTwoWeektoLastWeekTimeStrings, lastTwoWeekTimeStrings, last30DaysTimeStrings, last60to30DaysTimeStrings, lastOneYearTimeStrings } = timeData[timeDataKey]

      Object.entries(protocolRecordMapWithMissingData).forEach(([timeS, record]: any) => {
        // we dont create summary for items in protocols instead use the fetched records for others
        if (adapterType === AdapterType.PROTOCOLS) return;
        let { aggregated, timestamp } = record

        // if (timestamp > startOfDayTimestamp) return; // skip today's data

        if (!summaries.earliestTimestamp || timestamp < summaries.earliestTimestamp) summaries.earliestTimestamp = timestamp


        Object.entries(aggregated).forEach(([recordType, aggData]: any) => {
          let { chains, value } = aggData

          // if (value === 0) return; // skip zero values

          if (!summaries[recordType]) summaries[recordType] = initSummaryItem()
          if (!protocolData[recordType]) protocolData[recordType] = initProtocolDataItem()

          const summary = summaries[recordType] as RecordSummary
          const protocolRecord = protocolData[recordType]

          if (!skipChainSummary) {

            if (!summary.chart[timeS]) {
              summary.chart[timeS] = 0
              summary.chartBreakdown[timeS] = {}
            }

            summary.chart[timeS] += value
            summary.chartBreakdown[timeS][protocolName] = value
          }

          if (timestamp > protocolRecord.latestTimestamp)
            protocolRecord.latest = record
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

          if (lastWeekTimeStrings.has(timeS)) {
            protocolRecord.lastWeekData.push(aggData)
          } else if (lastTwoWeektoLastWeekTimeStrings.has(timeS)) {
            protocolRecord.lastTwoWeekToOneWeekData.push(aggData)
          } else if (lastTwoWeekTimeStrings.has(timeS)) {
            protocolRecord.lastTwoWeekData.push(aggData)
          } else if (last30DaysTimeStrings.has(timeS)) {
            protocolRecord.last30DaysData.push(aggData)
          } else if (last60to30DaysTimeStrings.has(timeS)) {
            protocolRecord.last60to30DaysData.push(aggData)
          } else if (lastOneYearTimeStrings.has(timeS)) {
            protocolRecord.lastOneYearData.push(aggData)
          }

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
        })
      })

      for (const recordType of recordTypes) {
        if (adapterType === AdapterType.PROTOCOLS) return;

        let _protocolData = protocolData[recordType]
        if (!_protocolData) continue
        let todayRecord = _protocolData.today
        let yesterdayRecord = _protocolData.yesterday
        // if (!todayRecord && !protocol.info.disabled) todayRecord = _protocolData.latest
        // if (!yesterdayRecord && !protocol.info.disabled) yesterdayRecord = _protocolData.latest
        const protocolSummary = initSummaryItem() as ProtocolSummary
        protocol.summaries[recordType] = protocolSummary

        addToSummary({ record: todayRecord?.aggregated[recordType], summaryKey: 'total24h', recordType, protocolSummary, skipChainSummary, })
        // if (protocol.info.defillamaId === '3809') {
        //   console.log('todayRecord',  protocolSummary, _protocolData.today, _protocolData.latest, lastTimeString, dayBeforeLastTimeString, _protocolData.today, _protocolData.yesterday)
        // }
        addToSummary({ record: yesterdayRecord?.aggregated[recordType], summaryKey: 'total48hto24h', recordType, protocolSummary, skipChainSummary, })
        addToSummary({ record: _protocolData.sevenDaysAgo?.aggregated[recordType], summaryKey: 'total7DaysAgo', recordType, protocolSummary, skipChainSummary, })
        addToSummary({ record: _protocolData.thirtyDaysAgo?.aggregated[recordType], summaryKey: 'total30DaysAgo', recordType, protocolSummary, skipChainSummary, })
        addToSummary({ records: _protocolData.lastWeekData, summaryKey: 'total7d', recordType, protocolSummary, skipChainSummary, })
        // addToSummary({ records: _protocolData.lastTwoWeekData, summaryKey: 'total14d', recordType, protocolSummary, skipChainSummary, })
        addToSummary({ records: _protocolData.lastTwoWeekToOneWeekData, summaryKey: 'total14dto7d', recordType, protocolSummary, skipChainSummary, })
        addToSummary({ records: _protocolData.last30DaysData, summaryKey: 'total30d', recordType, protocolSummary, skipChainSummary, })
        addToSummary({ records: _protocolData.last60to30DaysData, summaryKey: 'total60dto30d', recordType, protocolSummary, skipChainSummary, })
        addToSummary({ records: _protocolData.lastOneYearData, summaryKey: 'total1y', recordType, protocolSummary, skipChainSummary, })

        // totalAllTime
        const acumulativeRecordType = ACCOMULATIVE_ADAPTOR_TYPE[recordType]
        if (acumulativeRecordType) {
          const allKeys = Object.keys(protocol.records)
          allKeys.sort() // this is to ensure that we are processing the records in order
          allKeys.forEach((timeS: string) => {
            const { aggregated } = protocol.records[timeS]
            if (!aggregated[recordType]) return;
            const { value, chains } = aggregated[recordType]
            const { value: totalValue, chains: chainsTotal } = aggregated[acumulativeRecordType] ?? { value: 0, chains: {} }
            if (!protocolSummary.totalAllTime) protocolSummary.totalAllTime = 0
            protocolSummary.totalAllTime += value
            if (totalValue)
              protocolSummary.totalAllTime = totalValue
            Object.entries(chains).forEach(([chain, value]: any) => {
              if (!protocolSummary.chainSummary![chain]) protocolSummary.chainSummary![chain] = initSummaryItem(true)
              const chainSummary = protocolSummary.chainSummary![chain] as ProtocolSummary
              if (!chainSummary.totalAllTime) chainSummary.totalAllTime = 0
              chainSummary.totalAllTime += value
              if (chainsTotal[chain])
                chainSummary.totalAllTime = chainsTotal[chain]
            })
          })
        }

        // average1y
        protocolSummaryAction(protocolSummary, (summary: any) => {
          if (summary.total1y && _protocolData.lastOneYearData?.length > 0)
            summary.average1y = summary.total1y / protocol.records.length
        })
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
        if (todayRecord) {
          const { aggregated, breakdown = {} } = todayRecord
          if (aggregated[recordType]) {
            let breakdownData = Object.keys(breakdown[recordType] ?? {}).length ? breakdown[recordType] : { [protocolName]: aggregated[recordType] }
            const result: any = {}
            Object.entries(breakdownData).forEach(([subModuleName, { chains }]: any) => {
              Object.entries(chains).forEach(([chain, value]: any) => {
                if (!result[chain]) result[chain] = {}
                result[chain][subModuleName] = value
              })
            })
            protocolSummary.breakdown24h = result
          }
        }


      }

      if (!isParentProtocol) {
        protocolSummaries[protocol.info.id] = protocol


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
        parentProtocolSummaries[protocol.info.id] = protocol
      }
    }


    function addToSummary({ record, records = [], recordType, summaryKey, chainSummaryKey, protocolSummary, skipChainSummary = false }: { records?: any[], recordType: string, summaryKey: string, chainSummaryKey?: string, record?: any, protocolSummary: any, skipChainSummary?: boolean }) {
      if (protocolSummary) _addToSummary({ record, records, recordType, summaryKey, chainSummaryKey, summary: protocolSummary })
      // we need to skip updating summary because underlying child data is already used to update the summary
      if (!skipChainSummary) _addToSummary({ record, records, recordType, summaryKey, chainSummaryKey })
    }
    function _addToSummary({ record, records = [], recordType, summaryKey, chainSummaryKey, summary }: { records?: any[], recordType: string, summaryKey: string, chainSummaryKey?: string, record?: any, summary?: any }) {
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
          console.log(value, chains)
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
  info.childProtocols = childProtocolData.map(({ info }: any) => info?.name ?? info?.displayName)
  childProtocolData.forEach(({ records, info: childData }: any) => {

    const versionKey = childData.name ?? childData.displayName ?? childData.versionKey
    if (!versionKey) console.log('versionKey is missing', childData)

    // update child  metadata and chain info
    // info.childProtocols.push({ ...childData, versionKey })
    if (!info.chains) info.chains = []
    info.chains = Array.from(new Set(info.chains.concat(childData.chains ?? [])))

    Object.entries(records).forEach(([timeS, record]: any) => {
      if (!parentRecords[timeS]) parentRecords[timeS] = { breakdown: {}, aggregated: {} }

      Object.entries(record.aggregated).forEach(([recordType, childAggData]: any) => {
        if (!parentRecords[timeS].aggregated[recordType]) parentRecords[timeS].aggregated[recordType] = { value: 0, chains: {} }
        if (!parentRecords[timeS].breakdown[recordType]) parentRecords[timeS].breakdown[recordType] = {}
        if (!parentRecords[timeS].breakdown[recordType][versionKey]) parentRecords[timeS].breakdown[recordType][versionKey] = { value: 0, chains: {} }

        const aggItem = parentRecords[timeS].aggregated[recordType]
        const breakdownItem = parentRecords[timeS].breakdown[recordType][versionKey]
        aggItem.value += childAggData.value
        breakdownItem.value = childAggData.value
        Object.entries(childAggData.chains).forEach(([chain, value]: any) => {
          aggItem.chains[chain] = (aggItem.chains[chain] ?? 0) + value
          breakdownItem.chains[chain] = value
        })
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
    total24h: 0,
    total48hto24h: 0,
    chainSummary: {},
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

type RecordSummary = {
  total24h: number
  total48hto24h: number
  chart: IJSON<number>
  chartBreakdown: IJSON<IJSON<number>>
  earliestTimestamp?: number
  chainSummary?: IJSON<RecordSummary>
  total7d?: number
  total30d?: number
  total14dto7d?: number
  total60dto30d?: number
  total1y?: number
}

type ProtocolSummary = RecordSummary & {
  change_1d?: number
  change_7d?: number
  change_1m?: number
  change_7dover7d?: number
  average1y?: number
  totalAllTime?: number
  breakdown24h?: any
}

run().catch(console.error).then(() => process.exit(0))
// process.exit(0)

const accumulativeRecordTypeSet = new Set(Object.values(ACCOMULATIVE_ADAPTOR_TYPE))
// fill all missing data with the last available data
function getProtocolRecordMapWithMissingData({ records, info = {}, adapterType, metadata, }: { records: IJSON<any>, info?: any, adapterType: any, metadata: any, versionKey?: string }) {
  const { allSpikesAreGenuine, whitelistedSpikeSet = new Set() } = getSpikeConfig(metadata)
  const allKeys = Object.keys(records)

  // there is no point in maintaining accumulative data for protocols on all the records
  // we retain only the first and last record and compute the rest
  const accumRecordFirsts: IJSON<any> = {}
  const accumRecordLasts: IJSON<any> = {}
  allKeys.sort()
  allKeys.forEach((timeS: any, idx: number) => {
    const record = records[timeS]
    if (!record) {
      delete records[timeS]
      return;
    }
    const dataKeys = Object.keys(record.aggregated ?? {}).filter(key => ACCOMULATIVE_ADAPTOR_TYPE[key]) // we care about only base keys
    const values = dataKeys.map(key => record.aggregated?.[key]?.value ?? 0)
    const improbableValue = 5e10 // 50 billion
    if (values.some((i: any) => i > improbableValue)) {
      sdk.log('Invalid value found (ignoring it)', adapterType, metadata?.id, info?.name, timeS, values.find((i: any) => i > improbableValue))
      // sdk.log('Invalid value found (ignoring it)', info?.name, timeS, JSON.stringify(record, null, 2))
      delete records[timeS]
      return;
    }

    dataKeys.forEach((key: any) => {

      // code for logging spikes
      const currentValue = record.aggregated?.[key]?.value
      // we check if we have at least 7 days of data & value is higher than a million before checking if it is a spike
      if (idx > 7 && currentValue > 1e7 && !allSpikesAreGenuine && !whitelistedSpikeSet.has(timeS)) {
        const surroundingKeys = getSurroundingKeysExcludingCurrent(allKeys, idx)
        const highestCloseValue = surroundingKeys.map(i => records[i].aggregated?.[key]?.value ?? 0).filter(i => i).reduce((a, b) => Math.max(a, b), 0)
        if (highestCloseValue > 0 && currentValue > 10 * highestCloseValue) {
          sdk.log('Spike detected', adapterType, metadata?.id, info?.name, timeS, timeSToUnix(timeS), key, Number(currentValue / 1e6).toFixed(2) + 'm', Number(highestCloseValue / 1e6).toFixed(2) + 'm', Math.round(currentValue * 100 / highestCloseValue) / 100 + 'x')
          // sdk.log('Spike detected', info?.name, timeS, JSON.stringify(record, null, 2))
        }
      }

      // code for removing redundant cummulative data
      if (!accumulativeRecordTypeSet.has(key)) return;
      if (!accumRecordFirsts[key]) {
        accumRecordFirsts[key] = timeS
      } else if (!accumRecordLasts[key]) {
        accumRecordLasts[key] = timeS
      } else {
        const prevRecordWithVaule = records[accumRecordLasts[key]]
        delete prevRecordWithVaule.aggregated?.[key]
        delete prevRecordWithVaule.breakdown?.[key]
        accumRecordLasts[key] = timeS
      }
    })
  })
  let firstTimestamp: number
  let firstTimeS: string
  let lastTimeSWithData: string
  let nextTimeS: string
  // let currentTime = getStartOfTodayTime()
  let currentTime = getUnixTimeNow()
  const response: IJSON<any> = { ...records }
  const isDisabled = info?.disabled

  Object.entries(records).forEach(([timeS, record]: any) => {
    if (!firstTimestamp || record.timestamp < firstTimestamp) {
      firstTimestamp = record.timestamp
      firstTimeS = timeS
      lastTimeSWithData = timeS
    }
  })

  if (!firstTimeS!) return {}

  nextTimeS = firstTimeS

  // Code for filling in missing data with the last available data
  const fillUptoDays = 3 // we fill in data for upto 3 days
  let missingDataCounter = 0
  while (timeSToUnix(nextTimeS) < currentTime) {
    if (isDisabled) break; // we dont fill in data for disabled protocols
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
  allSpikesAreGenuine?: boolean
  whitelistedSpikeSet?: Set<string>
}

function getSpikeConfig(protocol: any): SpikeConfig {
  let info = (protocol as any)?.cleanRecordsConfig?.genuineSpikes ?? {}
  if (info === true) return { allSpikesAreGenuine: true, }
  const whitelistedSpikeSet = new Set() as Set<string>
  Object.entries(info).forEach(([key, value]: any) => {
    if (!value) return;
    const timeS = unixTimeToTimeS(key)
    whitelistedSpikeSet.add(timeS)
  })
  return { whitelistedSpikeSet }
}

function getSurroundingKeysExcludingCurrent<T>(array: T[], currentIndex: number, range = 7): T[] {
  const startIndex = Math.max(currentIndex - range, 0);
  const endIndex = Math.min(currentIndex + range, array.length);
  const beforeCurrent = array.slice(startIndex, currentIndex);
  const afterCurrent = array.slice(currentIndex + 1, endIndex + 1);
  return beforeCurrent.concat(afterCurrent);
}


function extractChildRecords({ records, versionKey }: { records: IJSON<any>, versionKey: string }) {
  const response: IJSON<any> = {}
  Object.entries(records).forEach(([timeS, record]: any) => {
    const parentBreakdown = record?.breakdown
    if (!parentBreakdown) return;
    const aggregated: any = {}
    // const breakdown: any = {}
    Object.entries(parentBreakdown).forEach(([recordType, breakdownData]: any) => {
      const childData = breakdownData[versionKey]
      if (!childData) return;
      aggregated[recordType] = childData
      // breakdown[recordType] = childData
    })

    response[timeS] = {
      aggregated,
      // breakdown,  // we dont need breakdown data for child records since there is only that protocol
    }
  })
  return response
}


const sluggifiedNormalizedChains: IJSON<string> = Object.keys(normalizeDimensionChainsMap).reduce((agg, chain) => ({ ...agg, [chain]: sluggifyString(chain.toLowerCase()) }), {})

async function generateDimensionsResponseFiles(cache: any) {
  for (const adapterType of ADAPTER_TYPES) {
    if (adapterType === AdapterType.PROTOCOLS) continue
    const cacheData = cache[adapterType]
    const { protocolSummaries, parentProtocolSummaries, } = cacheData

    const timeKey = `dimensions-gen-files ${adapterType}`
    console.time(timeKey)

    let recordTypes = getAdapterRecordTypes(adapterType)

    for (const recordType of recordTypes) {
      const timeKey = `dimensions-gen-files ${adapterType} ${recordType}`
      console.time(timeKey)

      // fetch and store overview of each record type
      const allData = await getOverviewProcess2({ recordType, cacheData, })
      await storeRouteData(`dimensions/${adapterType}/${recordType}-all`, allData)
      allData.totalDataChart = []
      allData.totalDataChartBreakdown = []
      await storeRouteData(`dimensions/${adapterType}/${recordType}-lite`, allData)

      // store per chain overview
      const chains = allData.allChains ?? []

      for (const chainLabel of chains) {
        let chain = chainLabel.toLowerCase()
        chain = sluggifiedNormalizedChains[chain] ?? chain
        const data = await getOverviewProcess2({ recordType, cacheData, chain })
        await storeRouteData(`dimensions/${adapterType}/${recordType}-chain/${chain}-all`, data)
        data.totalDataChart = []
        data.totalDataChartBreakdown = []
        await storeRouteData(`dimensions/${adapterType}/${recordType}-chain/${chain}-lite`, data)
      }

      // store protocol summary for each record type
      const allProtocols: any = { ...protocolSummaries, ...parentProtocolSummaries }
      for (let [id, protocol] of Object.entries(allProtocols) as any) {
        if (!protocol.info) {
          console.log('no info for protocol', id)
          continue
        }

        id = protocol.info.defillamaId ?? protocol.info.id ?? id

        const data = await getProtocolDataHandler2({ recordType, protocolData: protocol })
        const protocolSlug = sluggifyString(data.name)
        const protocolSlugDN = data.displayName ? sluggifyString(data.displayName) : null
        const differentDisplayName = protocolSlugDN && protocolSlug !== protocolSlugDN
        await storeRouteData(`dimensions/${adapterType}/${recordType}-protocol/${protocolSlug}-all`, data)
        if (differentDisplayName)
          await storeRouteData(`dimensions/${adapterType}/${recordType}-protocol/${protocolSlugDN}-all`, data)
        data.totalDataChart = []
        data.totalDataChartBreakdown = []
        await storeRouteData(`dimensions/${adapterType}/${recordType}-protocol/${protocolSlug}-lite`, data)
        if (differentDisplayName)
          await storeRouteData(`dimensions/${adapterType}/${recordType}-protocol/${protocolSlugDN}-lite`, data)
      }
    }

    console.timeEnd(timeKey)
  }
}