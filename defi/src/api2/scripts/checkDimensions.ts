import '../utils/failOnError'

import { DEFAULT_CHART_BY_ADAPTOR_TYPE, } from "../../adaptors/handlers/getOverviewProcess";
import { AdapterType, ProtocolType, } from "@defillama/dimension-adapters/adapters/types";
import loadAdaptorsData from "../../adaptors/data"
import { ADAPTER_TYPES } from "../../adaptors/handlers/triggerStoreAdaptorData";
import { getAllItemsAfter, } from "../../adaptors/db-utils/db2";
import { getTimeSDaysAgo, } from "../utils/time";
import { roundVaules, } from "../utils";
import * as sdk from "@defillama/sdk";
import { sendMessage } from '../../utils/discord';

let esClient: any
async function initES() {
  if (!esClient)
    esClient = sdk.elastic.getClient()
}


async function run() {
  // record time taken to run
  const start = Date.now()


  await initES()
  const allCache = {} as any
  const dateStringArray = [] as string[]
  for (let i = 0; i < 30; i++) {
    dateStringArray.push(getTimeSDaysAgo(i, true))
  }
  const lasDayString = dateStringArray[0]
  const dayBeforeLastString = dateStringArray[1]
  const last4Days = dateStringArray.slice(0, 4)

  // Go over all types
  await Promise.all(ADAPTER_TYPES.map(fetchDataLast30Days))

  const { protocolMap: protocolTypeProtocolMap } = loadAdaptorsData(AdapterType.PROTOCOLS)

  // generate summaries for all types
  await Promise.all(ADAPTER_TYPES.map(generateSummaries))

  const timeTaken = Number((Date.now() - start) / 1e3).toFixed(2)
  const timeTakensString = `Ran check in ${timeTaken}s`
  console.log(timeTakensString)

  await sendMessage(timeTakensString, process.env.VOLUMES_WEBHOOK)

  await esClient?.close()

  async function fetchDataLast30Days(adapterType: AdapterType) {
    // if (adapterType !== AdapterType.AGGREGATORS) return;

    if (!allCache[adapterType]) allCache[adapterType] = {
      protocols: {},
    }
    const adapterData = allCache[adapterType]

    await pullChangedFromDBAndAddToCache()


    async function pullChangedFromDBAndAddToCache() {
      let lastUpdated = Math.floor(Date.now() / 1e3) - 30 * 24 * 60 * 60  // 30 days ago
      const results = await getAllItemsAfter({ adapterType, timestamp: lastUpdated })

      results.forEach((result: any) => {
        const { id, timestamp, data, timeS, } = result
        roundVaules(data)
        if (!adapterData.protocols[id]) adapterData.protocols[id] = {
          records: {}
        }
        adapterData.protocols[id].records[timeS] = { ...data, timestamp, }
        adapterData.protocols[id].recordCount = Object.keys(adapterData.protocols[id].records).length
      })
    }
  }

  async function generateSummaries(adapterType: AdapterType) {
    if (adapterType === AdapterType.PROTOCOLS) return;

    const recordType = DEFAULT_CHART_BY_ADAPTOR_TYPE[adapterType]

    let { protocolMap: dimensionProtocolMap } = loadAdaptorsData(adapterType)

    // dex & fees sometimes share config & data, it is stored in AdapterType.PROTOCOLS
    const includeProtocolTypeData = [AdapterType.DEXS, AdapterType.FEES].includes(adapterType)
    let protocolRecordData = {} as any
    if (includeProtocolTypeData) {
      protocolRecordData = allCache[AdapterType.PROTOCOLS].protocols
      dimensionProtocolMap = { ...protocolTypeProtocolMap, ...dimensionProtocolMap }
    }

    const adapterData = allCache[adapterType]


    const protocolSummaries = {} as any
    const parentProtocolSummaries = {} as any
    const chainSet = new Set<string>()
    const parentProtocolsData: { [id: string]: any } = {}
    adapterData.protocolSummaries = protocolSummaries
    adapterData.parentProtocolSummaries = parentProtocolSummaries

    const summaries = [] as any
    for (const protocolInfo of Object.values(dimensionProtocolMap) as any) {
      if (protocolInfo.enabled === false || protocolInfo.disabled) continue; // we skip protocols that are disabled

      const summary = {} as any
      summaries.push(summary)
      const keys = ['id', 'id2', 'name', 'versionKey', 'protocolType', 'category', 'chain', 'chains', 'module', 'defillamaId']
      keys.forEach(key => summary[key] = protocolInfo[key] ?? null)
      if (protocolInfo.childProtocols?.length)
        summary.childProtocols = protocolInfo.childProtocols.map((child: any) => {
          return typeof child === 'string' ? child : child?.name
        })
      summary.aggregateData = {}
      summary.missingDays = []
      summary.updatedAt = Date.now()
      summary.missingDaysSinceLastData = 0
      summary.adapterType = adapterType



      const protocolId = protocolInfo.protocolType === ProtocolType.CHAIN ? protocolInfo.id2 : protocolInfo.id // this need not match the protocolId, like in the case of child protocol in breakdown adapter
      const protocolRecords = protocolRecordData[protocolId]?.records ?? {}

      // fetch each day's aggregate data
      const records = { ...(adapterData.protocols[protocolId]?.records ?? {}), ...protocolRecords }
      dateStringArray.forEach((timeS) => {
        const record = records[timeS]
        if (!record) return;
        const aggData = record.aggregated?.[recordType]?.value
        if (aggData || aggData === 0) {
          summary.aggregateData[timeS] = aggData
        }
      })

      // find missing days
      for (let i = 0; i < dateStringArray.length; i++) {
        const timeS = dateStringArray[i]
        const currentData = summary.aggregateData[timeS]
        const hasData = !!currentData || currentData === 0
        if (hasData) {
          if (!summary.lastDayWithData) summary.lastDayWithData = timeS
        } else {
          if (!summary.lastDayWithData) summary.missingDaysSinceLastData = i + 1
          summary.missingDays.push(timeS)
        }
      }
      if (!summary.lastDayWithData) summary.missing30PlusDays = true

      summary.recordCount = Object.keys(summary.aggregateData).length
      summary.missingCount = summary.missingDays.length

      // if it is a newly listed protocol, we dont want to show missing days
      if (!summary.missingDaysSinceLastData) summary.missingCount = 0

      if (summary.recordCount) {
        const values = Object.values(summary.aggregateData)
        summary.total = values.reduce((acc, val: any) => acc + val, 0)
        summary.average = summary.total / summary.recordCount

        if (summary.average > 1e8) summary.averageOver100M = true
        if (summary.average > 1e7) summary.averageOver10M = true
        if (summary.average > 1e6) summary.averageOver1M = true
        if (summary.average > 1e5) summary.averageOver100k = true
      }

      summary.todayValue = summary.aggregateData[lasDayString]
      summary.yesterdayValue = summary.aggregateData[dayBeforeLastString]

      // we have today's data and we have more than one day's data
      if (summary.aggregateData.hasOwnProperty(lasDayString) && summary.recordCount > 1) {
        if (summary.yesterdayValue) {
          summary.increaseIn24Hours = getDiffPercentage(summary.todayValue, summary.yesterdayValue)
        }

        const totalWithoutToday = summary.total - summary.todayValue
        const averageWithoutToday = totalWithoutToday / (summary.recordCount - 1)
        if (averageWithoutToday) {
          summary.increaseAgainstAverage30 = getDiffPercentage(summary.todayValue, averageWithoutToday)
        }

        // compute against average value excluding last 4 days
        const dataNonLast4Days = Object.entries(summary.aggregateData).filter(([timeS]) => !last4Days.includes(timeS)).map(([_, value]) => value)
        if (dataNonLast4Days.length) {
          const dataNonLast4DaysTotal: any = dataNonLast4Days.reduce((acc, val: any) => acc + val, 0)
          summary.average2 = dataNonLast4DaysTotal / dataNonLast4Days.length
          summary.increaseAgainstAverage4 = getDiffPercentage(summary.todayValue, summary.average2)
        }

      }

      const aggData = summary.aggregateData ?? {}
      summary.aggregateData = Object.entries(aggData).map(([timeS, value]) => ({ timeS, value }))

    }

    if (summaries.length) {
      setSignificance(summaries, 'average')
      console.log(`saving ${adapterType} summaries count: ${summaries.length}`)
      const body = summaries.flatMap((doc: any) => [{ index: { _index: 'dim_metrics_1', _id: `dm_${adapterType}_${doc.id2}` } }, doc])
      await esClient.bulk({ refresh: true, body })

      // write to discord
      const lines = [] as string[]

      // print missing last day data
      const missingLastDayData = summaries.filter((summary: any) => summary.missingDaysSinceLastData > 0 && summary.isSignificant)
      if (missingLastDayData.length) {
        const field = 'average'
        missingLastDayData.sort((a: any, b: any) => (b[field] ?? 0) - (a[field] ?? 0))
        lines.push('\n')
        lines.push('Missing data for significant protocols in ' + adapterType)
        lines.push(`\nProtocol - ${field} - Days since last data (missing count last 30d)`)
        missingLastDayData.forEach((item: any) => {
          lines.push(`${item.name} - ${hn(item[field])}m - ${item.missingDaysSinceLastData} (${item.missingCount}) days`)
        })
        lines.push('\n')
      }

      // print big spikes
      const bigSpikes = summaries.filter((summary: any) => {
        if (summary.recordCount < 7) return false // ignore small record count
        if (summary.todayValue === undefined || summary.todayValue < 5e5) return false // ignore small values
        if (summary.increaseAgainstAverage4 > 400) return true // 400% increase
        return false
      })

      if (bigSpikes.length) {
        const field = 'increaseAgainstAverage4'
        bigSpikes.sort((a: any, b: any) => (b[field] ?? 0) - (a[field] ?? 0))
        lines.push('Big spikes in ' + adapterType)
        lines.push('\n')
        lines.push(`\nProtocol - ${field} - Today - Yesterday - Avg2 (30d average excluding last 4 days) - recordCount`)
        bigSpikes.forEach((item: any) => {
          lines.push(`${item.name} - ${item[field]}% - ${hn(item.todayValue)} - ${hn(item.yesterdayValue)} - ${hn(item.average2)} - ${item.recordCount}`)
        })
        lines.push('\n')
      }


      // print big drops
      const bigDrops = summaries.filter((summary: any) => {
        if (summary.recordCount < 7) return false // ignore small record count
        if (!summary.average2 || summary.average2 < 1e4) return false // ignore small values
        if (summary.increaseAgainstAverage4 < -65) return true // 400% decrease
        return false
      })

      if (bigDrops.length) {
        const field = 'increaseAgainstAverage4'
        bigDrops.sort((a: any, b: any) => (a[field] ?? 0) - (b[field] ?? 0))
        lines.push('\n')
        lines.push('Big drops in ' + adapterType)
        lines.push(`Protocol - ${field} - Today - Yesterday - Avg2 (30d average excluding last 4 days) - recordCount\n`)
        bigDrops.forEach((item: any) => {
          lines.push(`${item.name} - ${item[field] * -1}% - ${hn(item.todayValue)} - ${hn(item.yesterdayValue)} - ${hn(item.average2)} - ${item.recordCount}`)
        })
        lines.push('\n')
      }

      await sendMessage(lines.join('\n'), process.env.VOLUMES_WEBHOOK)

    }

  }
}

const hn = (n: number) => n ? sdk.humanizeNumber(n) : '-'

run().catch(console.error).then(() => process.exit(0))

function getDiffPercentage(current: number, other: number) {
  return roundVaules(current * 100 / other - 100)
}

// function that takes a certain field to compare array of objects and sets 'isSignificant' to true if the item is in top 25% of the array
function setSignificance(array: any[], field: string) {
  const sorted = array.sort((a, b) => (b[field] ?? 0) - (a[field] ?? 0))
  const top20 = Math.floor(array.length * 0.25)
  sorted.forEach((item, index) => {
    item.isSignificant = index < top20
  })
}