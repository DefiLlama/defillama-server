import { ACCOMULATIVE_ADAPTOR_TYPE, getAdapterRecordTypes, } from "../../adaptors/handlers/getOverviewProcess";
import { AdapterType, ProtocolType, } from "@defillama/dimension-adapters/adapters/types";
import loadAdaptorsData from "../../adaptors/data"
import { IJSON, } from "../../adaptors/data/types";
import { storeDimensionsCacheV2, } from "../utils/dimensionsUtils";
import { ADAPTER_TYPES } from "../../adaptors/handlers/triggerStoreAdaptorData";
import { getAllItemsUpdatedAfter } from "../../adaptors/db-utils/db2";
import { toStartOfDay } from "../../adaptors/db-utils/AdapterRecord2";
import { getTimeSDaysAgo, getNextTimeS, getUnixTimeNow, timeSToUnix, getStartOfTodayTime } from "../utils/time";
import { getDisplayChainName } from "../../adaptors/utils/getAllChainsFromAdaptors";


const startOfDayTimestamp = toStartOfDay(new Date().getTime() / 1000)
const lastTimeString = getTimeSDaysAgo(0)
const dayBeforeLastTimeString = getTimeSDaysAgo(1)
const weekAgoTimeString = getTimeSDaysAgo(7)
const monthAgoTimeString = getTimeSDaysAgo(30)
const lastWeekTimeStrings = new Set(Array.from({ length: 7 }, (_, i) => getTimeSDaysAgo(i)))
const lastTwoWeektoLastWeekTimeStrings = new Set(Array.from({ length: 7 }, (_, i) => getTimeSDaysAgo(i + 7)))
const lastTwoWeekTimeStrings = new Set(Array.from({ length: 14 }, (_, i) => getTimeSDaysAgo(i)))
const last30DaysTimeStrings = new Set(Array.from({ length: 30 }, (_, i) => getTimeSDaysAgo(i)))
const last60to30DaysTimeStrings = new Set(Array.from({ length: 30 }, (_, i) => getTimeSDaysAgo(i + 30)))
const lastOneYearTimeStrings = new Set(Array.from({ length: 365 }, (_, i) => getTimeSDaysAgo(i)))

async function run() {

  // Go over all types
  // const data = await getDimensionsCacheV2()
  const data: any = {}

  function roundVaules(obj: any) {
    if (!obj) return obj;
    if (typeof obj === 'number') return Math.round(obj)
    if (typeof obj === 'object') {
      Object.entries(obj).forEach(([key, value]) => {
        obj[key] = roundVaules(value)
      })
    }
    return obj
  }

  const promises: any = ADAPTER_TYPES.map(async (adapterType) => {
    if (adapterType !== AdapterType.OPTIONS) return;

    const timeKey1 = `data load ${adapterType}`
    const timeKey2 = `db call ${adapterType}`
    const timeKey3 = `summary ${adapterType}`

    console.time(timeKey1)
    const { protocolMap } = loadAdaptorsData(adapterType)
    console.timeEnd(timeKey1)

    if (!data[adapterType]) data[adapterType] = {
      lastUpdated: 0,
      protocols: {}
    }
    const adapterData = data[adapterType]

    let lastUpdated = data[adapterType].lastUpdated ? data[adapterType].lastUpdated - 10 * 60 : 0 // 10 minutes ago

    const results = await getAllItemsUpdatedAfter({ adapterType, timestamp: lastUpdated })

    console.time(timeKey3)

    results.forEach((result: any) => {
      const { id, timestamp, data, timeS, } = result
      roundVaules(data)
      if (!adapterData.protocols[id]) adapterData.protocols[id] = {
        records: {}
      }
      adapterData.protocols[id].records[timeS] = { ...data, timestamp, }
    })

    const summaries: IJSON<RecordSummary> = {}
    const chainSet = new Set<string>()
    const recordTypes = getAdapterRecordTypes(adapterType)

    for (const [id, protocol] of Object.entries(adapterData.protocols) as any) {
      if (!protocolMap[id]) continue; // skip if protocol is not enabled
      // console.log('Processing', protocolMap[id].displayName, Object.values(adapterData.protocols[id].records).length, 'records')

      const protocolName = protocolMap[id].displayName ?? protocolMap[id].name
      const protocolData: any = {}
      protocol.summaries = {} as any
      const info = { ...protocolMap[id] }
      protocol.info = {};
      ['name', 'defillamaId', 'disabled', 'displayName', 'module', 'category', 'logo', 'chains', 'methodologyURL', 'methodology', 'gecko_id', 'forkedFrom', 'twitter', 'audits', 'description', 'address', 'url'].forEach(key => protocol.info[key] = (info as any)[key])
      if (info.parentProtocol) protocol.info.parentProtocol = info.parentProtocol
      protocol.info.latestFetchIsOk = true
      protocol.info.protocolType = info.protocolType ?? ProtocolType.PROTOCOL
      protocol.info.chains = info.chains.map(_getDisplayChainName)
      protocol.info.chains.forEach((chain: string) => chainSet.add(chain))
      const protocolRecordMapWithMissingData = getProtocolRecordMapWithMissingData(protocol.records)

      Object.entries(protocolRecordMapWithMissingData).forEach(([timeS, record]: any) => {
        let { aggregated, timestamp } = record

        if (timestamp > startOfDayTimestamp) return; // skip today's data

        if (!summaries.earliestTimestamp || timestamp < summaries.earliestTimestamp) summaries.earliestTimestamp = timestamp


        Object.entries(aggregated).forEach(([recordType, aggData]: any) => {
          let { chains, value } = aggData

          // if (value === 0) return; // skip zero values

          if (!summaries[recordType]) summaries[recordType] = initSummaryItem()
          if (!protocolData[recordType]) protocolData[recordType] = initProtocolDataItem()

          const summary = summaries[recordType] as RecordSummary
          const protocolRecord = protocolData[recordType]

          if (!summary.chart[timeS]) {
            summary.chart[timeS] = 0
            summary.chartBreakdown[timeS] = {}
          }

          summary.chart[timeS] += value
          summary.chartBreakdown[timeS][protocolName] = value

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
        let _protocolData = protocolData[recordType]
        if (!_protocolData) continue
        const todayRecord = _protocolData.today || _protocolData.latest
        const yesterdayRecord = _protocolData.yesterday || _protocolData.latest
        const protocolSummary = initSummaryItem() as ProtocolSummary
        protocol.summaries[recordType] = protocolSummary

        addToSummary({ record: todayRecord?.aggregated[recordType], summaryKey: 'total24h', recordType, protocolSummary })
        // if (protocol.info.defillamaId === '3809') {
        //   console.log('todayRecord',  protocolSummary, _protocolData.today, _protocolData.latest, lastTimeString, dayBeforeLastTimeString, _protocolData.today, _protocolData.yesterday)
        // }
        addToSummary({ record: yesterdayRecord?.aggregated[recordType], summaryKey: 'total48hto24h', recordType, protocolSummary })
        addToSummary({ record: _protocolData.sevenDaysAgo?.aggregated[recordType], summaryKey: 'total7DaysAgo', recordType, protocolSummary })
        addToSummary({ record: _protocolData.thirtyDaysAgo?.aggregated[recordType], summaryKey: 'total30DaysAgo', recordType, protocolSummary })
        addToSummary({ records: _protocolData.lastWeekData, summaryKey: 'total7d', recordType, protocolSummary })
        // addToSummary({ records: _protocolData.lastTwoWeekData, summaryKey: 'total14d', recordType, protocolSummary })
        addToSummary({ records: _protocolData.lastTwoWeekToOneWeekData, summaryKey: 'total14dto7d', recordType, protocolSummary })
        addToSummary({ records: _protocolData.last30DaysData, summaryKey: 'total30d', recordType, protocolSummary })
        addToSummary({ records: _protocolData.last60to30DaysData, summaryKey: 'total60dto30d', recordType, protocolSummary })
        addToSummary({ records: _protocolData.lastOneYearData, summaryKey: 'total1y', recordType, protocolSummary })

        // totalAllTime
        Object.values(protocol.records).forEach(({ aggregated }: any) => {
          if (!aggregated[recordType]) return;
          const { value, chains } = aggregated[recordType]
          if (!protocolSummary.totalAllTime) protocolSummary.totalAllTime = 0
          protocolSummary.totalAllTime += value
          Object.entries(chains).forEach(([chain, value]: any) => {
            if (!protocolSummary.chainSummary![chain]) protocolSummary.chainSummary![chain] = initSummaryItem(true)
            const chainSummary = protocolSummary.chainSummary![chain] as ProtocolSummary
            if (!chainSummary.totalAllTime) chainSummary.totalAllTime = 0
            chainSummary.totalAllTime += value
          })
        })

        // average1y
        protocolSummaryAction(protocolSummary, (summary: any) => {
          if (summary.total1y && _protocolData.lastOneYearData?.length > 0)
            summary.average1y = summary.total1y / protocol.records.length
        })
        // change_1d
        protocolSummaryAction(protocolSummary, (summary: any) => {
          if (typeof summary.total24h === 'number' && typeof summary.total48hto24h === 'number' && summary.total48hto24h !== 0)
            summary.change_1d = (summary.total24h - summary.total48hto24h) / summary.total48hto24h
        })
        // change_7d
        protocolSummaryAction(protocolSummary, (summary: any) => {
          if (typeof summary.total24h === 'number' && typeof summary.total7DaysAgo === 'number' && summary.total7DaysAgo !== 0)
            summary.change_7d = (summary.total24h - summary.total7DaysAgo) / summary.total7DaysAgo
        })
        // change_30d
        protocolSummaryAction(protocolSummary, (summary: any) => {
          if (typeof summary.total24h === 'number' && typeof summary.total30DaysAgo === 'number' && summary.total30DaysAgo !== 0)
            summary.change_7d = (summary.total24h - summary.total30DaysAgo) / summary.total30DaysAgo
        })
        // change_7dover7d
        protocolSummaryAction(protocolSummary, (summary: any) => {
          if (typeof summary.total7d === 'number' && typeof summary.total14dto7d === 'number' && summary.total14dto7d !== 0)
            summary.change_7dover7d = (summary.total7d - summary.total14dto7d) / summary.total14dto7d
        })
        // change_30dover30d
        protocolSummaryAction(protocolSummary, (summary: any) => {
          if (typeof summary.total30d === 'number' && typeof summary.total60dto30d === 'number' && summary.total60dto30d !== 0)
            summary.change_30dover30d = (summary.total30d - summary.total60dto30d) / summary.total60dto30d
        })

        // breakdown24h
        const todayData = protocol.records[lastTimeString]
        if (todayData) {
          const { aggregated, breakdown = {} } = todayData
          protocolSummary.breakdown24h = {}
          Object.entries(breakdown).forEach(([recordType, breakdown]: any) => {
            if (!aggregated[recordType]) return;
            let breakdownData = breakdown ?? { [protocolName]: aggregated[recordType].chains }
            const result: any = {}
            Object.entries(breakdownData).forEach(([subModuleName, { chains }]: any) => {
              Object.entries(chains).forEach(([chain, value]: any) => {
                if (!result[chain]) result[chain] = {}
                result[chain][subModuleName] = value
              })
            })
            protocolSummary.breakdown24h[recordType] = result
          })
        } else {
          protocolSummary.breakdown24h = null
        }
      }
    }

    // delete (summaries.dv as any).chart
    // delete (summaries.dv as any).chartBreakdown
    // delete (summaries as any).earliestTimestamp

    // adapterData.protocols = {}
    adapterData.summaries = summaries
    adapterData.allChains = Array.from(chainSet)
    adapterData.lastUpdated = getUnixTimeNow()
    console.timeEnd(timeKey3)

    function addToSummary({ record, records = [], recordType, summaryKey, chainSummaryKey, protocolSummary }: { records?: any[], recordType: string, summaryKey: string, chainSummaryKey?: string, record?: any, protocolSummary: any }) {
      if (protocolSummary) _addToSummary({ record, records, recordType, summaryKey, chainSummaryKey, summary: protocolSummary })
      _addToSummary({ record, records, recordType, summaryKey, chainSummaryKey })
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

  })
  await Promise.all(promises)
  await storeDimensionsCacheV2(data)
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

// fill all missing data with the last available data
function getProtocolRecordMapWithMissingData(records: IJSON<any>) {
  let firstTimestamp: number
  let firstTimeS: string
  let lastTimeSWithData: string
  let nextTimeS: string
  let currentTime = getStartOfTodayTime()
  let prevRecord: any
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
  addTotalValueDataTypesToRecord(records[firstTimeS])

  while (timeSToUnix(nextTimeS) < currentTime) {
    if (records[nextTimeS])
      lastTimeSWithData = nextTimeS
    else
      response[nextTimeS] = records[lastTimeSWithData!]

    const currentRecord = response[nextTimeS]
    addTotalValueDataTypesToRecord(currentRecord, prevRecord)

    nextTimeS = getNextTimeS(nextTimeS)
    prevRecord = currentRecord
  }

  return response
}

function addTotalValueDataTypesToRecord(record: IJSON<any>, previousRecord?: IJSON<any>) {
  const prevAggData = previousRecord?.aggregated ?? {}
  const aggData = record.aggregated
  let recordTypes = Object.keys(aggData).concat(Object.keys(prevAggData))
  recordTypes = Array.from(new Set(recordTypes))
  recordTypes.forEach(recordType => {
    const accRecordType = ACCOMULATIVE_ADAPTOR_TYPE[recordType]

    if (!accRecordType) return; // either it is already an accumulative type or this record type does not have an accumulative type
    if (aggData.hasOwnProperty(accRecordType)) return; // already has the accumulative type data

    if (!record.aggregated[accRecordType]) record.aggregated[accRecordType] = { value: 0, chains: {} }
    addData(aggData[recordType])
    addData(prevAggData[recordType])

    function addData({ value = 0, chains = {} }: any = {}) {
      record.aggregated[accRecordType].value += value
      Object.entries(chains).forEach(([chain, value]: any) => {
        record.aggregated[accRecordType].chains[chain] = (record.aggregated[accRecordType].chains[chain] ?? 0) + value
      })
    }
  })
}


const chainNameCache: IJSON<string> = {}

function _getDisplayChainName(chain: string) {
  if (!chainNameCache[chain]) chainNameCache[chain] = getDisplayChainName(chain) ?? chain
  return chainNameCache[chain]
}
