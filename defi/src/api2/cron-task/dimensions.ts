import '../utils/failOnError';
require("dotenv").config();

import { AdapterType, IJSON, ProtocolType, } from "@defillama/dimension-adapters/adapters/types";
import loadAdaptorsData from "../../adaptors/data";
import { getAllItemsForProtocol, getAllItemsUpdatedAfter } from "../../adaptors/db-utils/db2";
import { getDisplayChainNameCached, normalizeDimensionChainsMap, } from "../../adaptors/utils/getAllChainsFromAdaptors";
import { protocolsById } from "../../protocols/data";
import { parentProtocolsById } from "../../protocols/parentProtocols";
import { getDimensionsCacheV2, storeDimensionsCacheV2, storeDimensionsMetadata, } from "../utils/dimensionsUtils";
import { getNextTimeS, getTimeSDaysAgo, getUnixTimeNow, timeSToUnix, unixTimeToTimeS } from "../utils/time";

import * as sdk from '@defillama/sdk';
import { RUN_TYPE, roundVaules, } from "../utils";

import { ACCOMULATIVE_ADAPTOR_TYPE, ADAPTER_TYPES, AdaptorRecordType, ProtocolAdaptor, getAdapterRecordTypes, } from '../../adaptors/data/types';
import { sendMessage } from '../../utils/discord';
import { sluggifyString } from "../../utils/sluggify";
import { readRouteData, storeRouteData } from "../cache/file-cache";
import { getOverviewProcess2, getProtocolDataHandler2 } from "../routes/dimensions";
import { storeAppMetadata } from './appMetadata';

const blacklistedAppCategorySet = new Set([
  "Stablecoin Issuer", "MEV",
  "Liquid Staking",
])
const blacklistedAppIdSet = new Set([
  '4695', // bloXroute
])

const META_KEYS = [
  'id','defillamaId','name','displayName','slug','symbol','url','logo','module','category',
  'chains','methodologyURL','methodology','gecko_id','forkedFrom','twitter','audits','audit_links',
  'description','address','cmcId','github','governanceID','treasury','parentProtocol','previousNames',
  'hallmarks','defaultChartView','protocolType','linkedProtocols','versionKey'
]

function applyProtocolMetaFromProtoFile(target: any, src: any) {
  if (!src) return
  target.metadata = target.metadata || {}
  for (const k of META_KEYS) {
    if (src[k] !== undefined && target.metadata[k] === undefined) target.metadata[k] = src[k]
  }
  if (!target.slug && (target.metadata.slug || src.slug)) target.slug = (target.metadata.slug || src.slug)
}

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

type MQ = { monthly: Record<string, number>; quarterly: Record<string, number> }
type MQByLabel = { monthly: Record<string, Record<string, number>>, quarterly: Record<string, Record<string, number>> }
type AggregatedProtocolOut = { adapterType: string, slug: string, metrics: Record<string, MQ | MQByLabel>, metadata?: Record<string, any> }

type UECliff = { recipient?: string; category?: string; amount?: number }
type UELinear = { recipient?: string; category?: string; previousRatePerWeek?: number; newRatePerWeek?: number; endTimestamp?: number; unlockType?: string }
type UnlockEventRow = { timestamp: number; cliffAllocations?: UECliff[]; linearAllocations?: UELinear[]; summary?: { netChangeInWeeklyRate?: number; totalNewWeeklyRate?: number } }

function monthKeyFromUnix(ts: number) {
  const d = new Date(ts * 1000)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function quarterKeyFromUnix(ts: number) {
  const d = new Date(ts * 1000)
  const y = d.getUTCFullYear()
  const q = Math.floor(d.getUTCMonth() / 3) + 1
  return `${y}-Q${q}`
}

function rollupFromChart(chart: Array<[number, number]>): MQ {
  const monthly: Record<string, number> = {}
  const quarterly: Record<string, number> = {}
  for (const pair of chart || []) {
    const ts = coerceNum(pair?.[0])
    const val = coerceNum(pair?.[1])
    if (!Number.isFinite(ts) || !Number.isFinite(val)) continue
    const mk = monthKeyFromUnix(ts)
    const qk = quarterKeyFromUnix(ts)
    monthly[mk] = (monthly[mk] ?? 0) + val
    quarterly[qk] = (quarterly[qk] ?? 0) + val
  }
  return { monthly, quarterly }
}

function rollupFromLabelChart(series: Array<[number, Record<string, number>]>): MQByLabel {
  const monthly: Record<string, Record<string, number>> = {}
  const quarterly: Record<string, Record<string, number>> = {}
  for (const [ts, labels] of series || []) {
    if (typeof ts !== 'number' || typeof labels !== 'object') continue
    const mk = monthKeyFromUnix(ts)
    const qk = quarterKeyFromUnix(ts)
    for (const [label, v] of Object.entries(labels || {})) {
      const val = typeof v === 'number' ? v : Number(v) || 0
      if (!monthly[label]) monthly[label] = {}
      if (!quarterly[label]) quarterly[label] = {}
      monthly[label][mk] = (monthly[label][mk] ?? 0) + val
      quarterly[label][qk] = (quarterly[label][qk] ?? 0) + val
    }
  }
  return { monthly, quarterly }
}

/*
   - dssr = df - dr, if dssr missing and df & dr available
   - dr   = df - dssr, if dr   missing and df & dssr available
   - dhr  = dr - dssr, if dhr  missing and dr & dssr available
*/
type PlainKey  = 'df' | 'dr' | 'dssr' | 'dhr'
type LabelKey  = 'dfbl' | 'drbl' | 'dssrbl' | 'dhrbl'

const diffNumMap = (a: Record<string, number> = {}, b: Record<string, number> = {}) => {
  const out: Record<string, number> = {}
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of keys) {
    const v = (a[k] ?? 0) - (b[k] ?? 0)
    if (v !== 0) out[k] = v
  }
  return out
}

const diffLabel = (a?: Record<string, Record<string, number>>, b?: Record<string, Record<string, number>>) => {
  const out: Record<string, Record<string, number>> = {}
  const labels = new Set([...(a ? Object.keys(a) : []), ...(b ? Object.keys(b) : [])])
  for (const lbl of labels) out[lbl] = diffNumMap(a?.[lbl] ?? {}, b?.[lbl] ?? {})
  return out
}

function diffAggItem(a?: { value?: number; chains?: Record<string, number> }, b?: { value?: number; chains?: Record<string, number> }) {
  return {
    value: Number(a?.value ?? 0) - Number(b?.value ?? 0),
    chains: diffNumMap(a?.chains ?? {}, b?.chains ?? {}),
  }
}

function fillDerivedMetrics(proto: AggregatedProtocolOut) {
  const m = proto.metrics ?? {}

  const derivePlain = (out: PlainKey, a: PlainKey, b: PlainKey) => {
    const A = m[a] as MQ | undefined, B = m[b] as MQ | undefined
    if (!m[out] && A && B) {
      m[out] = {
        monthly: diffNumMap(A.monthly,   B.monthly),
        quarterly: diffNumMap(A.quarterly, B.quarterly),
      } as any
    }
  }

  const deriveLabel = (out: LabelKey, a: LabelKey, b: LabelKey) => {
    const A = m[a] as MQByLabel | undefined, B = m[b] as MQByLabel | undefined
    if (!m[out] && A && B) {
      m[out] = {
        monthly: diffLabel(A.monthly,   B.monthly),
        quarterly: diffLabel(A.quarterly, B.quarterly),
      } as any
    }
  }

  // Plain
  derivePlain('dssr', 'df', 'dr')   // dssr = df - dr
  derivePlain('dr', 'df', 'dssr')   // dr   = df - dssr
  derivePlain('dhr','dr', 'dssr')   // dhr  = dr - dssr

  // By-label
  deriveLabel('dssrbl', 'dfbl', 'drbl')  // dssrbl = dfbl - drbl
  deriveLabel('drbl', 'dfbl', 'dssrbl')  // drbl   = dfbl - dssrbl
  deriveLabel('dhrbl', 'drbl', 'dssrbl') // dhrbl  = drbl - dssrbl
}

function fillDerivedOnDailyRecord(rec: any) {
  if (!rec) return rec
  rec.aggregated = rec.aggregated || {}
  const Agg = rec.aggregated

  // Plain
  if (!Agg.dssr && Agg.df && Agg.dr) Agg.dssr = diffAggItem(Agg.df, Agg.dr)
  if (!Agg.dr && Agg.df && Agg.dssr) Agg.dr = diffAggItem(Agg.df, Agg.dssr)
  if (!Agg.dhr && Agg.dr && Agg.dssr) Agg.dhr = diffAggItem(Agg.dr, Agg.dssr)

  // By-label
  const BL = rec.bl ?? rec.breakdownLabel
  if (BL) {
    if (!BL.dssr && BL.df && BL.dr) BL.dssr = diffNumMap(BL.df, BL.dr)
    if (!BL.dr && BL.df && BL.dssr) BL.dr = diffNumMap(BL.df, BL.dssr)
    if (!BL.dhr && BL.dr && BL.dssr) BL.dhr = diffNumMap(BL.dr, BL.dssr)
    rec.bl = BL
    rec.breakdownLabel = BL
  }

  return rec
}

function serializeAggregate(proto: AggregatedProtocolOut & { generatedAt?: number }) {
  const { slug, metrics } = proto
  const meta = proto.metadata || {}
  return { slug, metrics, ...meta }
}

const INCENTIVE_KEYS = new Set(['du','dubl','di'])
const isIncentiveKey = (k: string) => INCENTIVE_KEYS.has(k)

function collectProtocolSlugs(p: ProtocolAdaptor) {
  const out = new Set<string>()
  const main = sluggifyString(p.name ?? p.displayName ?? '')
  if (main) out.add(main)
  if (Array.isArray((p as any).previousNames)) (p as any).previousNames.forEach((n: any) => out.add(sluggifyString(String(n))))
  return out
}

type RollKind = 'plain'|'label'

async function readAndRollup(route: string, kind: RollKind): Promise<{ key: string, value: MQ | MQByLabel, raw: any } | null> {
  const res = await readRouteData(route) as any
  if (!res) return null

  if (route.endsWith('-all')) {
    const chart = res?.totalDataChart
    if (!Array.isArray(chart) || !chart.length) return null
    return {
      key: route.includes('/df-') ? 'df'
         : route.includes('/dr-') ? 'dr'
         : route.includes('/dhr-') ? 'dhr'
         : route.includes('/dssr-') ? 'dssr' : '',
      value: rollupFromChart(chart),
      raw: res,
    }
  }

  if (kind === 'label') {
    const series = res?.totalDataChartBreakdownLabel
    if (!Array.isArray(series) || !series.length) return null
    return {
      key: route.includes('/df-') ? 'dfbl'
         : route.includes('/dr-') ? 'drbl'
         : route.includes('/dhr-') ? 'dhrbl'
         : route.includes('/dssr-') ? 'dssrbl' : '',
      value: rollupFromLabelChart(series),
      raw: res,
    }
  }
  return null
}

async function hydrateSlugMetricsFromFiles(slug: string, protoMap: Record<string, AggregatedProtocolOut & { generatedAt?: number }>, adapterType: AdapterType) {
  const ensure = () => ensureProto(protoMap, slug, adapterType)

  const bases = ['df','dr','dhr','dssr']
  const routesAll = bases.map(k => `dimensions/fees/${k}-protocol/${slug}-all`)
  const routesBL = bases.map(k => `dimensions/fees/${k}-protocol/${slug}-bl`)

  for (const r of routesAll) {
    const rolled = await readAndRollup(r, 'plain')
    if (rolled && rolled.key) {
      ensure()
      applyProtocolMetaFromProtoFile(protoMap[slug], rolled.raw)
      protoMap[slug].metrics[rolled.key] = rolled.value
    }
  }
  for (const r of routesBL) {
    const rolled = await readAndRollup(r, 'label')
    if (rolled && rolled.key) {
      ensure()
      protoMap[slug].metrics[rolled.key] = rolled.value
    }
  }
}

function ensureProto(protoMap: Record<string, AggregatedProtocolOut & { generatedAt?: number }>, slug: string, adapterType: AdapterType) {
  return (protoMap[slug] ||= {
    generatedAt: Math.floor(Date.now() / 1000),
    adapterType,
    slug,
    metrics: {},
  })
}

function mergeIncentivesIntoProtoMap(protoMap: Record<string, AggregatedProtocolOut & { generatedAt?: number }>, incentivesAggMap?: Record<string, { metrics: Record<string, MQ|MQByLabel>, metadata?: any }>) {
  if (!incentivesAggMap) return
  for (const [slug, inc] of Object.entries(incentivesAggMap)) {
    const p = ensureProto(protoMap, slug, AdapterType.FEES as any)
    Object.entries(inc.metrics || {}).forEach(([k, v]) => {
      if (isIncentiveKey(k)) p.metrics[k] = v as any
    })
    p.metadata = p.metadata || {}
    Object.entries(inc.metadata || {}).forEach(([k, v]) => {
      if (p.metadata![k] === undefined) p.metadata![k] = v
    })
  }
}

function addIntoAccum(accum: any, key: string, val: MQ | MQByLabel) {
  const dst = (accum[key] ||= { monthly: {}, quarterly: {} })
  const isLabel = key.endsWith('bl')

  const addNum = (a: Record<string, number>, b?: Record<string, number>) =>
    Object.entries(b || {}).forEach(([k, v]) => a[k] = (a[k] ?? 0) + (v || 0))

  if (isLabel) {
    Object.entries((val as MQByLabel).monthly || {}).forEach(([label, mp]) => {
      (dst.monthly[label] ||= {}); addNum(dst.monthly[label], mp)
    })
    Object.entries((val as MQByLabel).quarterly || {}).forEach(([label, mp]) => {
      (dst.quarterly[label] ||= {}); addNum(dst.quarterly[label], mp)
    })
  } else {
    addNum(dst.monthly, (val as MQ).monthly)
    addNum(dst.quarterly, (val as MQ).quarterly)
  }
}

function buildParentsFromChildren(protoMap: Record<string, AggregatedProtocolOut & { generatedAt?: number }>) {
  const parentGroups: Record<string, string[]> = {}
  Object.entries(protoMap).forEach(([slug, proto]) => {
    const parentId = proto.metadata?.parentProtocol
    if (!parentId) return
    if (!parentGroups[parentId]) parentGroups[parentId] = []
    parentGroups[parentId].push(slug)
  })

  for (const [parentId, childSlugs] of Object.entries(parentGroups)) {
    const parentInfo = parentProtocolsById[parentId]
    if (!parentInfo) continue

    const parentSlug = sluggifyString(parentInfo.name || String(parentId))
    const accum: Record<string, any> = {}

    for (const slug of childSlugs) {
      const child = protoMap[slug]
      if (!child) continue
      for (const [metricKey, val] of Object.entries(child.metrics || {})) {
        if (isIncentiveKey(metricKey)) continue
        addIntoAccum(accum, metricKey, val as any)
      }
    }

    const existingParent = protoMap[parentSlug]
    if (existingParent?.metrics) {
      for (const [k, v] of Object.entries(existingParent.metrics)) {
        if (isIncentiveKey(k)) accum[k] = v
      }
    }

    const parentProto: AggregatedProtocolOut & { generatedAt?: number } = {
      adapterType: AdapterType.FEES as any,
      slug: parentSlug,
      metrics: accum,
      metadata: {
        ...(existingParent?.metadata || {}),
        ...parentInfo,
        slug: parentSlug,
        parentProtocol: null,
        protocolType: ProtocolType.PROTOCOL,
      }
    }

    fillDerivedMetrics(parentProto)

    protoMap[parentSlug] = parentProto
  }
}

async function generateAggregatesFromBuild(incentivesAggMap?: Record<string, { metrics: Record<string, MQ|MQByLabel>, metadata?: any }>) {
  const adapterType = AdapterType.FEES
  const { protocolMap } = loadAdaptorsData(adapterType)
  const feeProtocols = Object.values(protocolMap || {}) as ProtocolAdaptor[]
  if (!feeProtocols.length) return

  const protoMap: Record<string, AggregatedProtocolOut & { generatedAt?: number }> = {}

  for (const p of feeProtocols) {
    const slugs = collectProtocolSlugs(p)
    for (const slug of slugs) {
      await hydrateSlugMetricsFromFiles(slug, protoMap, adapterType)
    }
  }

  mergeIncentivesIntoProtoMap(protoMap, incentivesAggMap)

  buildParentsFromChildren(protoMap)

  for (const [slug, proto] of Object.entries(protoMap)) {
    await storeRouteData(`dimensions/aggregates/${slug}`, serializeAggregate(proto))
  }
}

const EMISSIONS_API = process.env.DIM_EMISSIONS_ENDPOINT || 'https://api.llama.fi/emissions'

const BAD_SUFFIX = /(-all|-lite|-bl)$/i
function cleanIncentiveSlug(s: string) {
  if (!s) return s
  return sluggifyString(s.replace(BAD_SUFFIX, ''))
}

type EmissionEntry = {
  token?: string
  sources?: string[]
  protocolId?: any
  name?: string
  displayName?: string
  chains?: string[]
  gecko_id?: string
  events?: any[]
  unlockEvents?: any[]
  nextEvent?: any
}

async function fetchEmissionsFull(): Promise<EmissionEntry[]> {
  try {
    const r = await fetch(`${EMISSIONS_API}?fullChart=true`)
    if (r.ok) {
      const arr = await r.json()
      if (Array.isArray(arr)) return arr
    }
  } catch (e) { /* ignore */ }

  try {
    const r2 = await fetch(EMISSIONS_API)
    if (!r2.ok) throw new Error(`/emissions ${r2.status}`)
    const arr2 = await r2.json()
    if (Array.isArray(arr2)) return arr2
  } catch (e) {
    console.error('Failed to fetch emissions', e)
  }
  return []
}

function chainFromTokenString(t?: string): string | null {
  if (!t) return null
  const ix = t.indexOf(':')
  if (ix === -1) return null
  return t.slice(0, ix)
}

function enrichWithKnownProtocolMeta(entry: any) {
  const pid = entry?.protocolId
  if (!pid) return

  if (String(pid).startsWith('parent#')) {
    const key = String(pid).slice('parent#'.length)
    const parent = parentProtocolsById[key]
    if (parent) {
      META_KEYS.forEach((k) => {
        if (entry[k] === undefined && (parent as any)[k] !== undefined) entry[k] = (parent as any)[k]
      })
      if (entry.parentProtocol === undefined) entry.parentProtocol = key
    }
    return
  }

  const p = protocolsById[pid]
  if (p) {
    META_KEYS.forEach((k) => {
      if (entry[k] === undefined && (p as any)[k] !== undefined) entry[k] = (p as any)[k]
    })
  }
}

function dayUTC(ts: number) {
  const d = new Date(ts * 1000)
  d.setUTCHours(0, 0, 0, 0)
  return Math.floor(d.getTime() / 1000)
}

function coerceNum(x: any): number { const n = Number(x); return Number.isFinite(n) ? n : 0 }
const SECONDS_PER_DAY = 86400

type DailyBreakdown = Record<number, Record<string, number>> // tsDay -> { label: amount }

function labelFromUE(x: { recipient?: string; category?: string } = {} as any) {
  const r = x?.recipient ? String(x.recipient).trim() : ''
  if (r) return r
  const c = x?.category ? String(x.category).trim() : ''
  return c || 'Uncategorized'
}

function buildDailyFromUnlockEvents(unlockEvents: UnlockEventRow[]): DailyBreakdown {
  const ues = Array.isArray(unlockEvents) ? unlockEvents.slice() : []
  ues.sort((a, b) => coerceNum(a?.timestamp) - coerceNum(b?.timestamp))
  if (!ues.length) return {}

  const changesByDay: Record<number, Record<string, number>> = {}
  const cliffsByDay: Record<number, Record<string, number>> = {}

  let minDay = Number.POSITIVE_INFINITY
  let maxDay = 0

  for (const ev of ues) {
    const tsDay = dayUTC(coerceNum(ev?.timestamp))
    if (!Number.isFinite(tsDay)) continue
    if (tsDay < minDay) minDay = tsDay
    if (tsDay > maxDay) maxDay = tsDay

    const cliffs = Array.isArray(ev?.cliffAllocations) ? ev.cliffAllocations : []
    for (const c of cliffs) {
      const lbl = labelFromUE(c || {})
      const amt = coerceNum(c?.amount)
      if (amt > 0) {
        cliffsByDay[tsDay] = cliffsByDay[tsDay] || {}
        cliffsByDay[tsDay][lbl] = (cliffsByDay[tsDay][lbl] ?? 0) + amt
      }
    }

    const lins = Array.isArray(ev?.linearAllocations) ? ev.linearAllocations : []
    for (const l of lins) {
      const lbl = labelFromUE(l || {})
      const newRate = Math.max(0, coerceNum(l?.newRatePerWeek))
      changesByDay[tsDay] = changesByDay[tsDay] || {}
      changesByDay[tsDay][lbl] = newRate

      const end = l?.endTimestamp ? dayUTC(coerceNum(l.endTimestamp)) : 0
      if (end && end >= tsDay) {
        changesByDay[end] = changesByDay[end] || {}
        if (changesByDay[end][lbl] === undefined) changesByDay[end][lbl] = 0
      }
      if (end > maxDay) maxDay = end
    }
  }

  const todayDay = dayUTC(Math.floor(Date.now() / 1000))
  const lastDay = todayDay

  if (!Number.isFinite(minDay)) return {}

  const currentWeeklyRateByLabel: Record<string, number> = {}
  const daily: DailyBreakdown = {}

  for (let d = minDay; d <= lastDay; d += SECONDS_PER_DAY) {
    const sets = changesByDay[d]
    if (sets) {
      Object.entries(sets).forEach(([lbl, rate]) => {
        currentWeeklyRateByLabel[lbl] = Math.max(0, coerceNum(rate))
      })
    }

    const cliffs = cliffsByDay[d]
    if (cliffs) {
      daily[d] = daily[d] || {}
      Object.entries(cliffs).forEach(([lbl, amt]) => {
        const n = Math.max(0, coerceNum(amt))
        if (n > 0) daily[d][lbl] = (daily[d][lbl] ?? 0) + n
      })
    }

    const labels = Object.keys(currentWeeklyRateByLabel)
    if (labels.length) {
      const perLabel: Record<string, number> = {}
      labels.forEach(lbl => {
        const w = currentWeeklyRateByLabel[lbl] || 0
        if (w > 0) perLabel[lbl] = w / 7
      })
      if (Object.keys(perLabel).length) {
        daily[d] = daily[d] || {}
        Object.entries(perLabel).forEach(([lbl, val]) => {
          daily[d][lbl] = (daily[d][lbl] ?? 0) + val
        })
      }
    }
  }

  return daily
}

function breakdownToSeries(
  daily: DailyBreakdown
): { total: Array<[number, number]>, byLabel: Array<[number, Record<string, number>]> } {
  const days = Object.keys(daily).map(k => coerceNum(k)).sort((a, b) => a - b)
  const total: Array<[number, number]> = []
  const byLabel: Array<[number, Record<string, number>]> = []

  for (const ts of days) {
    const labels = daily[ts] || {}
    let sum = 0
    for (const v of Object.values(labels)) {
      const n = coerceNum(v)
      if (n > 0) sum += n
    }
    total.push([ts, sum])
    byLabel.push([ts, labels])
  }
  return { total, byLabel }
}

async function fetchEmissionUsdChart(slug: string): Promise<{ totalUsd?: Array<[number, number]>, byLabelUsd?: Array<[number, Record<string, number>]> }> {
  try {
    const r = await fetch(`https://api.llama.fi/emission/${slug}`)
    if (!r.ok) return {}
    const outer = await r.json()
    const payload = typeof outer?.body === 'string' ? JSON.parse(outer.body) : outer

    const totalUsd: Array<[number, number]> | undefined = payload?.unlockUsdChart || payload?.usdChart || payload?.totalUsdChart
    const byLabelUsd: Array<[number, Record<string, number>]> | undefined = payload?.unlockUsdByLabelChart || payload?.usdByLabelChart

    return { totalUsd, byLabelUsd }
  } catch {
    return {}
  }
}

function baseIncentivePayload(item: EmissionEntry, extra: any) {
  const token = item.token || null
  const chains = Array.isArray(item.chains) && item.chains.length
    ? item.chains
    : (chainFromTokenString(token || undefined) ? [chainFromTokenString(token!)!] : ['unknown'])
  const displayName = item.displayName || item.name

  return {
    name: item.name,
    displayName,
    chains,
    token,
    sources: item.sources ?? [],
    protocolId: item.protocolId ?? null,
    gecko_id: item.gecko_id ?? null,
    ...extra,
  }
}

async function generateIncentivesFromEmissions(): Promise<Record<string, {metrics: Record<string, MQ|MQByLabel>, metadata?: any}>> {
  const list = await fetchEmissionsFull()
  const out: Record<string, {metrics: Record<string, MQ|MQByLabel>, metadata?: any}> = {}
  if (!Array.isArray(list) || !list.length) return out

  for (const item of list) {
    if (!item?.name) continue
    const slug = cleanIncentiveSlug(item.name)
    if (!slug) continue

    const dailyUE = buildDailyFromUnlockEvents((item.unlockEvents || []) as any)
    const { total: dailyDU, byLabel: dailyDUBL } = breakdownToSeries(dailyUE)
    const { totalUsd: dailyDIUSD } = await fetchEmissionUsdChart(slug)

    const duPayload = baseIncentivePayload(item, {
      totalDataChart: dailyDU,
      totalDataChartBreakdownLabel: dailyDUBL,
    })
    enrichWithKnownProtocolMeta(duPayload)
    await storeRouteData(`dimensions/incentives/duprotocol/${slug}`, duPayload)

    const diPayload = baseIncentivePayload(item, {
      totalDataChartUSD: dailyDIUSD,
    })
    enrichWithKnownProtocolMeta(diPayload)
    await storeRouteData(`dimensions/incentives/diprotocol/${slug}`, diPayload)

    out[slug] = {
      metrics: {
        du: rollupFromChart(dailyDU),
        dubl: rollupFromLabelChart(dailyDUBL as any),
        ...(dailyDIUSD ? { di: rollupFromChart(dailyDIUSD as any) } : {}),
      },
      metadata: {
        name: duPayload.name,
        displayName: duPayload.displayName,
        chains: duPayload.chains,
        token: duPayload.token,
        gecko_id: duPayload.gecko_id,
        protocolId: duPayload.protocolId,
        sources: duPayload.sources,
        parentProtocol: (duPayload as any).parentProtocol,
      }
    }
  }
  return out
}

async function run() {
  // Go over all types
  const allCache = await getDimensionsCacheV2(RUN_TYPE.CRON)
  await Promise.all(ADAPTER_TYPES.map(updateAdapterData))
  await storeDimensionsCacheV2(allCache) // store the updated cache

  // generate summaries for all types
  ADAPTER_TYPES.map(generateSummaries)

  if (NOTIFY_ON_DISCORD) {
    if (spikeRecords.length) {
      await sendMessage(`
        Spikes detected and removed:
      ${spikeRecords.join('\n')}
        `, process.env.DIM_CHANNEL_WEBHOOK!)
    }
    if (invalidDataRecords.length) {
      await sendMessage(`
        Invalid records detected and removed:
      ${invalidDataRecords.join('\n')}
        `, process.env.DIM_CHANNEL_WEBHOOK!)
    }
  }

  // store what all metrics are available for each protocol
  const protocolSummaryMetadata: { [key: string]: Set<string> } = {}

  Object.keys(allCache).forEach((key) => {

    const { protocolSummaries = {}, parentProtocolSummaries = {} } = allCache[key]

    const addProtocol = (protocolId: any) => {
      const { summaries = {} } = protocolSummaries[protocolId] ?? parentProtocolSummaries[protocolId] ?? {}
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

  const incentivesAggMap = await generateIncentivesFromEmissions()

  await generateAggregatesFromBuild(incentivesAggMap)

  async function updateAdapterData(adapterType: AdapterType) {
    // if (adapterType !== AdapterType.DERIVATIVES) return;

    if (!allCache[adapterType]) allCache[adapterType] = {
      lastUpdated: 0,
      protocols: {},
    }
    const adapterData = allCache[adapterType]
    // init per-protocol backfill flags map
    if (!adapterData.blHistoryFetched) adapterData.blHistoryFetched = {}

    await pullChangedFromDBAndAddToCache()

    async function pullChangedFromDBAndAddToCache() {
      let lastUpdated = allCache[adapterType].lastUpdated ? allCache[adapterType].lastUpdated - 1 * 60 * 60 : 0 // 1 hour ago
      
      const results = await getAllItemsUpdatedAfter({ adapterType, timestamp: lastUpdated })

      const protocolsWithBlDataInRecentUpdates = new Set<string>()
      
      results.forEach((result: any) => {
        const { id, timestamp, data, timeS } = result

        const bl = (result as any).bl ?? (result as any).breakdownLabel ?? (result as any).data?.bl ?? (result as any).data?.breakdownLabel

        if (bl) {
          protocolsWithBlDataInRecentUpdates.add(id)
        }

        roundVaules(data)

        if (!adapterData.protocols[id]) adapterData.protocols[id] = { records: {} }

        const finalRecord: any = { ...data, timestamp }
        if (bl) {
          finalRecord.bl = bl;
          finalRecord.breakdownLabel = bl;
          adapterData.protocols[id].hasBreakdownData = true;
        }

        fillDerivedOnDailyRecord(finalRecord)
        adapterData.protocols[id].records[timeS] = finalRecord
      })

      // backfill full history ONLY for protocols that newly emitted bl and have not been backfilled
      const toBackfill = Array.from(protocolsWithBlDataInRecentUpdates)
        .filter((pid: string) => !adapterData.blHistoryFetched[pid])

      for (const pid of toBackfill) {
        try {
          const history = await getAllItemsForProtocol({ adapterType, id: pid, timestamp: 0 })
          let merged = 0
          history.forEach((result: any) => {
            const { id, timestamp, data, timeS } = result
            const bl = (result as any).bl ?? (result as any).breakdownLabel ?? (result as any).data?.bl ?? (result as any).data?.breakdownLabel

            if (bl) {
              roundVaules(data)
              if (!adapterData.protocols[id]) adapterData.protocols[id] = { records: {} }

              const finalRecord: any = { ...data, timestamp }
              finalRecord.bl = bl;
              finalRecord.breakdownLabel = bl;
              adapterData.protocols[id].hasBreakdownData = true;
              fillDerivedOnDailyRecord(finalRecord)
              adapterData.protocols[id].records[timeS] = finalRecord
              merged++
            }
          })
          adapterData.blHistoryFetched[pid] = getUnixTimeNow()
        } catch (e) {
          console.error(`BL backfill failed for protocol ${pid} (${adapterType})`, e)
        }
      }

      // remove empty records at the start of each protocol
      Object.keys(adapterData.protocols).forEach((protocolId) => {
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
          Object.keys(records[day]?.aggregated ?? {}).forEach((recordType) => {
            const { value = 0 } = records[day].aggregated[recordType] ?? {}
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
      })

      adapterData.lastUpdated = getUnixTimeNow()
    }
  }

  function generateSummaries(adapterType: AdapterType) {
    const timeKey1 = `data load ${adapterType}`

    const recordTypes = getAdapterRecordTypes(adapterType)

    console.time(timeKey1)
    let { protocolMap: dimensionProtocolMap } = loadAdaptorsData(adapterType)
    console.timeEnd(timeKey1)

    const adapterData = allCache[adapterType]
    const timeKey3 = `summary ${adapterType}`

    console.time(timeKey3)

    const protocolSummaries = {} as any
    const parentProtocolSummaries = {} as any
    const summaries: IJSON<RecordSummary> = {}
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
    console.timeEnd(timeKey3)

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
      protocol.misc = {  }; // TODO: check, this is not stored in cache correctly and as workaround we are storing it in info object
      const infoKeys = ['name', 'defillamaId', 'displayName', 'module', 'category', 'logo', 'chains', 'methodologyURL', 'methodology', 'gecko_id', 'forkedFrom', 'twitter', 'audits', 'description', 'address', 'url', 'audit_links', 'versionKey', 'cmcId', 'id', 'github', 'governanceID', 'treasury', 'parentProtocol', 'previousNames', 'hallmarks', 'defaultChartView']


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
      // console.log('Processing', protocolName, Object.values(records).length, 'records')

      protocol.records = records
      const protocolRecordMapWithMissingData = getProtocolRecordMapWithMissingData({ records, info: protocol.info, adapterType, metadata: dimensionProtocolInfo })
      // console.log('protocolRecordMapWithMissingData', protocolName, Object.values(protocolRecordMapWithMissingData).length, 'records', 'skipChainSummary', skipChainSummary)
      // const hasTodayData = !!protocol.records[todayTimestring]
      // const timeDataKey = hasTodayData ? 'today' : 'yesterday'
      const timeDataKey = 'yesterday' // we always use yesterday data for now, reason being we dont have have real time data for a lot of protocols
      const { lastTimeString, dayBeforeLastTimeString, weekAgoTimeString, monthAgoTimeString, lastWeekTimeStrings, lastTwoWeektoLastWeekTimeStrings, lastTwoWeekTimeStrings, last30DaysTimeStrings, last60to30DaysTimeStrings, lastOneYearTimeStrings } = timeData[timeDataKey]

      const labelSeriesByRecordType: Record<string, Array<[number, Record<string, number>]>> = {}

      Object.entries(protocolRecordMapWithMissingData).forEach(([timeS, record]: any) => {
        // we dont create summary for items in protocols instead use the fetched records for others
        let { aggregated, } = record
        const timestamp = timeSToUnix(timeS)
        // if (timestamp > startOfDayTimestamp) return; // skip today's data

        const BL = record.bl ?? record.breakdownLabel
        if (BL && typeof BL === 'object') {
          Object.entries(BL).forEach(([rt, labels]: any) => {
            const byLabel: Record<string, number> = {}
            Object.entries(labels || {}).forEach(([lbl, val]: any) => {
              const n = Number(val) || 0
              if (n !== 0) byLabel[lbl] = (byLabel[lbl] ?? 0) + n
            })
            if (Object.keys(byLabel).length) {
              if (!labelSeriesByRecordType[rt]) labelSeriesByRecordType[rt] = []
              labelSeriesByRecordType[rt].push([timestamp, byLabel])
            }
          })
        }

        Object.entries(aggregated).forEach(addRecordData)

        if (hasAppMetrics) {
          const dailyFeesData = aggregated[AdaptorRecordType.dailyFees]
          const dailyRevenueData = aggregated[AdaptorRecordType.dailyRevenue]

          if (dailyFeesData) addRecordData([AdaptorRecordType.dailyAppFees, dailyFeesData])
          if (dailyRevenueData) addRecordData([AdaptorRecordType.dailyAppRevenue, dailyRevenueData])
        }

        function addRecordData([recordType, aggData]: any) {
          let { chains, value } = aggData
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
            protocolRecord.lastWeekData.push(aggData)
          if (lastTwoWeektoLastWeekTimeStrings.has(timeS))
            protocolRecord.lastTwoWeekToOneWeekData.push(aggData)
          if (lastTwoWeekTimeStrings.has(timeS))
            protocolRecord.lastTwoWeekData.push(aggData)
          if (last30DaysTimeStrings.has(timeS))
            protocolRecord.last30DaysData.push(aggData)
          if (last60to30DaysTimeStrings.has(timeS))
            protocolRecord.last60to30DaysData.push(aggData)
          if (lastOneYearTimeStrings.has(timeS))
            protocolRecord.lastOneYearData.push(aggData)

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
      })

      protocol.precomputed = protocol.precomputed || { labelSeriesByRecordType: {} }

      for (const recordType of recordTypes) {
        const labelSeries = labelSeriesByRecordType[recordType] || []
        if (labelSeries.length) {
          protocol.precomputed.labelSeriesByRecordType[recordType] = labelSeries
        }
      }

      for (const recordType of recordTypes) {

        let _protocolData = protocolData[recordType]
        if (!_protocolData) continue
        let todayRecord = _protocolData.today
        let yesterdayRecord = _protocolData.yesterday
        let protocolLatestRecord = undefined

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
        addToSummary({ record: todayRecord?.aggregated[recordLabel], summaryKey: 'total24h', recordType, protocolSummary, skipChainSummary, protocolLatestRecord: protocolLatestRecord?.aggregated[recordLabel], debugParams, })
        addToSummary({ record: yesterdayRecord?.aggregated[recordLabel], summaryKey: 'total48hto24h', recordType, protocolSummary, skipChainSummary, debugParams, })
        addToSummary({ record: _protocolData.sevenDaysAgo?.aggregated[recordType], summaryKey: 'total7DaysAgo', recordType, protocolSummary, skipChainSummary, debugParams, })
        addToSummary({ record: _protocolData.thirtyDaysAgo?.aggregated[recordType], summaryKey: 'total30DaysAgo', recordType, protocolSummary, skipChainSummary, debugParams, })
        addToSummary({ records: _protocolData.lastWeekData, summaryKey: 'total7d', recordType, protocolSummary, skipChainSummary, debugParams, })
        // addToSummary({ records: _protocolData.lastTwoWeekData, summaryKey: 'total14d', recordType, protocolSummary, skipChainSummary, debugParams, })
        addToSummary({ records: _protocolData.lastTwoWeekToOneWeekData, summaryKey: 'total14dto7d', recordType, protocolSummary, skipChainSummary, debugParams, })
        addToSummary({ records: _protocolData.last30DaysData, summaryKey: 'total30d', recordType, protocolSummary, skipChainSummary, debugParams, })
        addToSummary({ records: _protocolData.last60to30DaysData, summaryKey: 'total60dto30d', recordType, protocolSummary, skipChainSummary, debugParams, })
        addToSummary({ records: _protocolData.lastOneYearData, summaryKey: 'total1y', recordType, protocolSummary, skipChainSummary, debugParams, })

        // add record count
        const allKeys = Object.keys(protocol.records)
        allKeys.forEach((timeS: string) => {
          const { aggregated } = protocol.records[timeS]
          if (!aggregated[recordType]) return;
          protocolSummary.recordCount++
          const { chains } = aggregated[recordType]
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
            const { aggregated } = protocol.records[timeS]
            if (!aggregated[recordType]) return;
            const { value, chains } = aggregated[recordType]
            // if are not tracking the protocol's data from it's launch
            // we accept the accumulative record as the total value if it exists in the first 10 records
            // else, we dont trust the accumulative record and compute it using daily data
            const canUseAccumulativeRecord = idx < 10
            let accumulativeRecord = { value: 0, chains: {} }

            if (canUseAccumulativeRecord && aggregated[acumulativeRecordType])
              accumulativeRecord = aggregated[acumulativeRecordType]

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
            records.forEach((i: any) => addBreakdownData({ recordType, record: { aggregated: { [recordLabel]: i } }, storeKey, skipChainSummary }))
            return;
          }

          const { aggregated = {}, breakdown = {} } = record ?? {}

          if (aggregated[recordType]) {
            let breakdownData = Object.keys(breakdown[recordType] ?? {}).length ? breakdown[recordType] : { [protocolName]: aggregated[recordType] }
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

    function addToSummary({ record, records = [], recordType, summaryKey, chainSummaryKey, protocolSummary, skipChainSummary = false, protocolLatestRecord, debugParams, }: { records?: any[], recordType: string, summaryKey: string, chainSummaryKey?: string, record?: any, protocolSummary: any, skipChainSummary?: boolean, protocolLatestRecord?: any, debugParams?: any }) {
      // protocolLatestRecord ?? record is a hack to show latest data as protocol's 24h data but not use that record for computing chain/global summary
      if (protocolSummary) _addToSummary({ record: protocolLatestRecord ?? record, records, recordType, summaryKey, chainSummaryKey, summary: protocolSummary, debugParams, })
      // we need to skip updating summary because underlying child data is already used to update the summary
      if (!skipChainSummary) _addToSummary({ record, records, recordType, summaryKey, chainSummaryKey, debugParams })
    }
    function _addToSummary({ record, records = [], recordType, summaryKey, chainSummaryKey, summary, debugParams }: { records?: any[], recordType: string, summaryKey: string, chainSummaryKey?: string, record?: any, summary?: any, debugParams?: any }) {
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
  childProtocolData.forEach(({ records, info: childData }: any) => {

    const childProtocolLabel = childData.name ?? childData.displayName
    childData.linkedProtocols = info.linkedProtocols

    if (!childProtocolLabel) console.log('childProtocolLabel is missing', childData)

    // update child  metadata and chain info
    // info.childProtocols.push({ ...childData, childProtocolLabel })
    if (!info.chains) info.chains = []
    info.chains = Array.from(new Set(info.chains.concat(childData.chains ?? [])))

    Object.entries(records).forEach(([timeS, record]: any) => {
      if (!parentRecords[timeS]) parentRecords[timeS] = { breakdown: {}, aggregated: {} }

      Object.entries(record.aggregated).forEach(([recordType, childAggData]: any) => {
        if (!parentRecords[timeS].aggregated[recordType]) parentRecords[timeS].aggregated[recordType] = { value: 0, chains: {} }
        if (!parentRecords[timeS].breakdown[recordType]) parentRecords[timeS].breakdown[recordType] = {}
        if (!parentRecords[timeS].breakdown[recordType][childProtocolLabel]) parentRecords[timeS].breakdown[recordType][childProtocolLabel] = { value: 0, chains: {} }

        const aggItem = parentRecords[timeS].aggregated[recordType]
        const breakdownItem = parentRecords[timeS].breakdown[recordType][childProtocolLabel]
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
  recordCount: number
}

type ProtocolSummary = RecordSummary & {
  change_1d?: number
  change_7d?: number
  change_1m?: number
  change_7dover7d?: number
  average1y?: number
  monthlyAverage1y?: number
  totalAllTime?: number
  breakdown24h?: any
  breakdown30d?: any
}

run()
  .catch(console.error)
  .then(storeAppMetadata)
  .then(() => process.exit(0))

const spikeRecords = [] as any[]
const invalidDataRecords = [] as any[]

const NOTIFY_ON_DISCORD = process.env.DIM_CRON_NOTIFY_ON_DISCORD === 'true'
const ThreeMonthsAgo = (Date.now() / 1000) - 3 * 30 * 24 * 60 * 60
const isLessThanThreeMonthsAgo = (timeS: string) => timeSToUnix(timeS) > ThreeMonthsAgo

const accumulativeRecordTypeSet = new Set(Object.values(ACCOMULATIVE_ADAPTOR_TYPE))
// fill all missing data with the last available data
function getProtocolRecordMapWithMissingData({ records, info = {}, adapterType, metadata, }: { records: IJSON<any>, info?: any, adapterType: any, metadata: any, }) {
  const { whitelistedSpikeSet = new Set() } = getSpikeConfig(metadata)
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
      if (NOTIFY_ON_DISCORD)
        invalidDataRecords.push([adapterType, metadata?.id, info?.name, timeS, values.find((i: any) => i > improbableValue)].map(i => i + ' ').join(' '))
      sdk.log('Invalid value found (removing it)', adapterType, metadata?.id, info?.name, timeS, values.find((i: any) => i > improbableValue))
      delete records[timeS]
      return;
    }

    dataKeys.forEach((key: any) => {

      // code for logging spikes
      const currentValue = record.aggregated?.[key]?.value
      // we check if we have at least 7 days of data & value is higher than a million before checking if it is a spike
      if (idx > 7 && currentValue > 1e7 && !whitelistedSpikeSet.has(timeS)) {
        const surroundingKeys = getSurroundingKeysExcludingCurrent(allKeys, idx)
        const highestCloseValue = surroundingKeys.map(i => records[i]?.aggregated?.[key]?.value ?? 0).filter(i => i).reduce((a, b) => Math.max(a, b), 0)
        let isSpike = false
        if (highestCloseValue > 0) {
          let currentValueisHigh = currentValue > 1e6 // 1 million
          switch (key) {
            case 'dv':
            case 'dnv': currentValueisHigh = currentValue > 3e8; break; // 300 million
          }
          let spikeRatio = currentValueisHigh ? 3 : 10
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

const sluggifiedNormalizedChains: IJSON<string> = Object.keys(normalizeDimensionChainsMap).reduce((agg, chain) => ({ ...agg, [chain]: sluggifyString(chain.toLowerCase()) }), {})

async function generateDimensionsResponseFiles(cache: any) {
  const dimChainsAggData: any = {}
  for (const adapterType of ADAPTER_TYPES) {
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
      const totalDataChartByChain: any = {}

      for (const chainLabel of chains) {
        let chain = chainLabel.toLowerCase()
        chain = sluggifiedNormalizedChains[chain] ?? chain
        const data = await getOverviewProcess2({ recordType, cacheData, chain })
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

      await storeRouteData(`/config/smol/dimensions-${adapterType}-${recordType}-total-data-chart`, totalDataChartByChain)

      // store protocol summary for each record type
      const allProtocols: any = { ...protocolSummaries, ...parentProtocolSummaries }
      for (let [id, protocol] of Object.entries(allProtocols) as any) {
        if (!protocol.info) {
          console.log('no info for protocol', id)
          continue
        }

        const data = await getProtocolDataHandler2({ recordType, protocolData: protocol })
        const protocolSlug = sluggifyString(data.name)
        const protocolSlugDN = data.displayName ? sluggifyString(data.displayName) : null

        if (!data.totalDataChart?.length) continue; // skip if there is no data

        const differentDisplayName = protocolSlugDN && protocolSlug !== protocolSlugDN
        let fileLabels = differentDisplayName ? [protocolSlugDN] : []
        if (Array.isArray(data.previousNames)) fileLabels.push(...data.previousNames.map(sluggifyString))
        fileLabels.push(protocolSlug)

        fileLabels = [...new Set(fileLabels)]
        for (const fileLabel of fileLabels)
          await storeRouteData(`dimensions/${adapterType}/${recordType}-protocol/${fileLabel}-all`, data)

        // labels-only breakdown for -bl file
        const labelSeries = protocol.precomputed?.labelSeriesByRecordType?.[recordType] ?? []
        const breakdownData: any = { ...data, totalDataChartBreakdownLabel: labelSeries }

        for (const fileLabel of fileLabels)
          await storeRouteData(`dimensions/${adapterType}/${recordType}-protocol/${fileLabel}-bl`, breakdownData)

        data.totalDataChart = []
        data.totalDataChartBreakdown = []

        for (const fileLabel of fileLabels)
          await storeRouteData(`dimensions/${adapterType}/${recordType}-protocol/${fileLabel}-lite`, data)
      }
    }

    console.timeEnd(timeKey)
  }
  await storeRouteData(`dimensions/chain-agg-data`, dimChainsAggData)
}