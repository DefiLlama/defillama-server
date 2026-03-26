require("dotenv").config();

import fetch from "node-fetch"
import * as sdk from "@defillama/sdk"
import { sendMessage } from "../../utils/discord"
import { AdapterType, ADAPTER_TYPES } from "../types"
import { AdaptorRecordType, DEFAULT_CHART_BY_ADAPTOR_TYPE, getAdapterRecordTypes } from "../data/types"
import loadAdaptorsData from "../data"

// ── Config ──────────────────────────────────────────────────────────────────────
const MONTHS = parseInt(process.env.DIM_DROP_MONTHS ?? process.argv[2] ?? '12', 10)
const DROP_THRESHOLD = 0.8 // 80% drop
const VOLUME_AVG1Y_THRESHOLD = 10_000
const DEFAULT_AVG1Y_THRESHOLD = 3
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY
const API_BASE = process.env.LLAMA_API_BASE ?? (INTERNAL_API_KEY ? `https://pro-api.llama.fi/${INTERNAL_API_KEY}/api` : 'https://api.llama.fi')
const WEBHOOK = process.env.DIM_ERROR_CHANNEL_WEBHOOK
// ─────────────────────────────────────────────────────────────────────────────────

const VOLUME_RELATED_METRICS = new Set([
  AdaptorRecordType.dailyVolume,
  AdaptorRecordType.totalVolume,
  AdaptorRecordType.dailyBridgeVolume,
  AdaptorRecordType.totalBridgeVolume,
  AdaptorRecordType.dailyNormalizedVolume,
  AdaptorRecordType.dailyPremiumVolume,
  AdaptorRecordType.totalPremiumVolume,
  AdaptorRecordType.dailyNotionalVolume,
  AdaptorRecordType.totalNotionalVolume,
  AdaptorRecordType.openInterestAtEnd,
  AdaptorRecordType.shortOpenInterestAtEnd,
  AdaptorRecordType.longOpenInterestAtEnd,
  AdaptorRecordType.dailyActiveLiquidity,
])

// Map from short code back to full name for API query param
const AdaptorRecordTypeReverse: Record<string, string> = {}
for (const [key, value] of Object.entries(AdaptorRecordType)) {
  AdaptorRecordTypeReverse[value] = key
}

type DropResult = {
  adapterType: string
  metric: string
  name: string
  id: string
  module: string
  totalAllTime: number
  average1y: number
  preDropAvg: number
  postDropAvg: number
  dropPct: number
  dropDurationDays: number
}

async function fetchJSON(url: string): Promise<any> {
  const headers: any = {}
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.json()
}

function getThreshold(metric: AdaptorRecordType): number {
  return VOLUME_RELATED_METRICS.has(metric) ? VOLUME_AVG1Y_THRESHOLD : DEFAULT_AVG1Y_THRESHOLD
}

const ignoredMetricTypes = new Set([
  AdaptorRecordType.dailyCreatorRevenue,
  AdaptorRecordType.shortOpenInterestAtEnd,
  AdaptorRecordType.longOpenInterestAtEnd,
  AdaptorRecordType.dailyActiveLiquidity,
])

async function run() {
  const cutoffDate = new Date()
  cutoffDate.setMonth(cutoffDate.getMonth() - MONTHS)
  const cutoffTs = Math.floor(cutoffDate.getTime() / 1000)

  console.log(`Detecting sustained drops (>${DROP_THRESHOLD * 100}%) over past ${MONTHS} months`)
  console.log(`Volume threshold: $${VOLUME_AVG1Y_THRESHOLD.toLocaleString()}, Other threshold: $${DEFAULT_AVG1Y_THRESHOLD.toLocaleString()}\n`)

  const drops: DropResult[] = []
  // Track which protocols already have an entry per adapterType
  const seenByAdapterType: Record<string, Set<string>> = {}

  // Build set of dead protocol IDs across all adapter types
  const deadProtocolIds = new Set<string>()
  for (const adapterType of ADAPTER_TYPES) {
    try {
      const { protocolAdaptors } = loadAdaptorsData(adapterType)
      for (const p of protocolAdaptors) {
        if (p.isDead) deadProtocolIds.add(p.defillamaId ?? p.id)
      }
    } catch { }
  }
  console.log(`Loaded ${deadProtocolIds.size} dead protocols to ignore\n`)

  for (const adapterType of ADAPTER_TYPES) {
    const metrics = getAdapterRecordTypes(adapterType)
    if (!seenByAdapterType[adapterType]) seenByAdapterType[adapterType] = new Set()

    for (const metric of metrics) {
      if (ignoredMetricTypes.has(metric)) continue;

      const metricName = AdaptorRecordTypeReverse[metric]
      if (!metricName) continue

      const threshold = getThreshold(metric)
      const url = `${API_BASE}/overview/${adapterType}?dataType=${metricName}`

      console.log(`── ${adapterType} / ${metricName} ──`)

      let overview: any
      try {
        overview = await fetchJSON(url)
      } catch (e: any) {
        console.log(`  Failed to fetch: ${e.message}`)
        continue
      }

      if (!overview?.protocols?.length) {
        console.log(`  No protocols`)
        continue
      }

      // Filter protocols with significant average1y, excluding dead protocols and already-seen
      const significant = overview.protocols.filter((p: any) =>
        p.average1y && p.average1y >= threshold
        && !deadProtocolIds.has(p.id ?? p.defillamaId)
        && !seenByAdapterType[adapterType].has(p.id ?? p.defillamaId)
      )

      if (!significant.length) {
        console.log(`  No protocols above threshold ($${threshold.toLocaleString()})`)
        continue
      }

      console.log(`  ${significant.length} significant protocols (of ${overview.protocols.length})`)

      // Build lookup from protocol name/displayName to summary data
      const protoByName: Record<string, any> = {}
      for (const p of significant) {
        const names = [p.name, p.displayName, p.module, p.slug].filter(Boolean)
        for (const n of names) protoByName[n.toLowerCase()] = p
      }
      const significantNames = new Set(Object.keys(protoByName))

      // Extract per-protocol daily series from totalDataChartBreakdown
      // Format: [[timestamp, {protocolName: value, ...}], ...]
      const breakdown: [number, Record<string, number>][] = overview.totalDataChartBreakdown ?? []
      if (!breakdown.length) {
        console.log(`  No chart breakdown data`)
        continue
      }

      // Build the full daily timestamp set from the breakdown to detect missing data points
      const allTimestamps = new Set(breakdown.map(([ts]) => ts))

      // Build per-protocol time series: { protocolName: [ts, value][] }
      const protocolSeries: Record<string, [number, number][]> = {}
      // Track which timestamps each protocol has data for
      const protocolTimestamps: Record<string, Set<number>> = {}
      for (const [ts, protoValues] of breakdown) {
        for (const [protoName, value] of Object.entries(protoValues)) {
          if (!significantNames.has(protoName.toLowerCase())) continue
          if (!protocolSeries[protoName]) protocolSeries[protoName] = []
          if (!protocolTimestamps[protoName]) protocolTimestamps[protoName] = new Set()
          protocolSeries[protoName].push([ts, value as number])
          protocolTimestamps[protoName].add(ts)
        }
      }

      // Analyze each significant protocol for drops
      for (const [protoName, chart] of Object.entries(protocolSeries)) {
        if (chart.length < 14) continue

        const proto = protoByName[protoName.toLowerCase()]
        if (!proto) continue
        const protoId = proto.id ?? proto.defillamaId
        if (seenByAdapterType[adapterType].has(protoId)) continue

        // Filter to relevant time window
        const recentChart = chart.filter(([ts]) => ts >= cutoffTs)
        if (recentChart.length < 7) continue

        // Build set of timestamps where this protocol has data in the analysis window
        const protoTs = protocolTimestamps[protoName]
        // Get all global timestamps in the recent window to detect missing data points
        const recentGlobalTimestamps = [...allTimestamps].filter(ts => ts >= cutoffTs).sort((a, b) => a - b)

        // Use a rolling 7-day average as the pre-drop baseline
        // Walk through the recent chart computing a trailing 7d avg, and detect where
        // values consistently drop >80% below the 7d avg that existed just before the drop
        let dropStartIdx = -1
        let consecutiveDropDays = 0
        let preDropAvg7d = 0

        for (let i = 0; i < recentChart.length; i++) {
          const [ts, value] = recentChart[i]

          // Check for missing timestamps between data points (adapter error gaps)
          if (i > 0) {
            const prevTs = recentChart[i - 1][0]
            const missingBetween = recentGlobalTimestamps.filter(t => t > prevTs && t < ts && !protoTs.has(t))
            if (missingBetween.length > 0) {
              // Gap in data — reset drop detection
              dropStartIdx = -1
              consecutiveDropDays = 0
            }
          }

          // Compute trailing 7-day average from data points before this one
          const windowStart = i >= 7 ? i - 7 : 0
          const windowSlice = recentChart.slice(windowStart, i)
          const trailing7dAvg = windowSlice.length > 0
            ? windowSlice.reduce((s, [, v]) => s + v, 0) / windowSlice.length
            : 0

          const dropThresholdValue = trailing7dAvg * (1 - DROP_THRESHOLD)

          if (trailing7dAvg >= threshold && value <= dropThresholdValue) {
            if (dropStartIdx === -1) {
              dropStartIdx = i
              preDropAvg7d = trailing7dAvg // capture the 7d avg just before the drop started
            }
            consecutiveDropDays++
          } else {
            dropStartIdx = -1
            consecutiveDropDays = 0
          }
        }

        // Also check for trailing missing data at the end (protocol disappeared from recent breakdown)
        if (dropStartIdx !== -1 && recentChart.length > 0) {
          const lastProtoTs = recentChart[recentChart.length - 1][0]
          const trailingMissing = recentGlobalTimestamps.filter(t => t > lastProtoTs && !protoTs.has(t))
          if (trailingMissing.length > 3) {
            dropStartIdx = -1
            consecutiveDropDays = 0
          }
        }

        // Must have stayed dropped for at least 7 consecutive days and still dropped at end
        if (consecutiveDropDays < 7 || dropStartIdx === -1) continue

        const droppedData = recentChart.slice(dropStartIdx)
        const postDropAvg = droppedData.reduce((s, [, v]) => s + v, 0) / droppedData.length
        const dropPct = ((preDropAvg7d - postDropAvg) / preDropAvg7d) * 100
        const dropDurationDays = droppedData.length

        seenByAdapterType[adapterType].add(protoId)

        drops.push({
          adapterType,
          metric: metricName,
          name: proto.displayName || proto.name || protoName,
          id: protoId || '?',
          module: proto.module || proto.slug || '',
          totalAllTime: proto.totalAllTime ?? 0,
          average1y: proto.average1y ?? 0,
          preDropAvg: preDropAvg7d,
          postDropAvg,
          dropPct,
          dropDurationDays,
        })
      }
    }
  }

  // Sort by adapterType first, then by most recent drops (fewest days = most recent)
  drops.sort((a, b) => {
    const typeCompare = a.adapterType.localeCompare(b.adapterType)
    if (typeCompare !== 0) return typeCompare
    return a.dropDurationDays - b.dropDurationDays
  })

  if (!drops.length) {
    console.log('\nNo sustained drops detected.')
    return
  }

  // Build table
  const header = [
    'Type'.padEnd(20),
    'Metric'.padEnd(22),
    'Protocol'.padEnd(25),
    'ID'.padEnd(8),
    'AllTime'.padStart(14),
    'Avg1Y'.padStart(14),
    'PreDrop'.padStart(14),
    'PostDrop'.padStart(14),
    'Drop%'.padStart(8),
    'Days'.padStart(6),
  ].join(' | ')

  const separator = '-'.repeat(header.length)

  const rows = drops.map(d => [
    d.adapterType.padEnd(20),
    d.metric.padEnd(22),
    d.name.slice(0, 25).padEnd(25),
    d.id.toString().slice(0, 8).padEnd(8),
    fmtNum(d.totalAllTime).padStart(14),
    fmtNum(d.average1y).padStart(14),
    fmtNum(d.preDropAvg).padStart(14),
    fmtNum(d.postDropAvg).padStart(14),
    `${d.dropPct.toFixed(1)}%`.padStart(8),
    d.dropDurationDays.toString().padStart(6),
  ].join(' | '))

  const title = `Sustained Drops Report (past ${MONTHS} months, >${DROP_THRESHOLD * 100}% drop, 7+ days)`
  const table = [title, separator, header, separator, ...rows, separator].join('\n')

  console.log('\n' + table)
  console.log(`\nTotal: ${drops.length} protocols with sustained drops`)

  // Send to Discord
  if (WEBHOOK && false) {
    try {
      await sendMessage(`${title}\nTotal: ${drops.length} protocols\n${separator}\n${header}\n${separator}`, WEBHOOK)
      // Send rows in chunks to avoid Discord 2000 char limit
      const chunkSize = 8
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize).join('\n')
        await sendMessage(chunk, WEBHOOK)
      }
      console.log('\nSent to dimensions error channel.')
    } catch (e: any) {
      console.error('Failed to send to Discord:', e.message)
    }
  } else {
    console.log('\nDIM_ERROR_CHANNEL_WEBHOOK not set, skipping Discord notification.')
  }

  // Store results to cache for dim-status dashboard
  const cacheData = {
    generationTime: new Date().toISOString(),
    months: MONTHS,
    dropThreshold: DROP_THRESHOLD,
    totalDrops: drops.length,
    drops,
  }
  try {
    await sdk.cache.writeCache('dimDetectDrops-latest', cacheData, {
      skipCompression: true,
      skipR2CacheWrite: false,
    })
    console.log('Stored drop detection results to cache.')
  } catch (e: any) {
    console.error('Failed to store to cache:', e.message)
  }
}

function fmtNum(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
