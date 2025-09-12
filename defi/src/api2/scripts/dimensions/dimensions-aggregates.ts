require('dotenv').config()

import * as fs from 'fs'
import * as path from 'path'
import { storeRouteData } from '../../cache/file-cache'

type MQ = { monthly: Record<string, number>; quarterly: Record<string, number> }
type MQByLabel = {
  monthly: Record<string, Record<string, number>>  // label -> YYYY-MM -> sum
  quarterly: Record<string, Record<string, number>> // label -> YYYY-Qx -> sum
}
type ProtoOut = {
  generatedAt: number
  adapterType: string
  slug: string
  id?: string | number
  defillamaId?: string | number
  name?: string
  displayName?: string
  slugMeta?: string
  protocolType?: string
  parentProtocol?: string | number
  module?: string
  category?: string
  logo?: string
  chains?: string[]
  chain?: string
  address?: string
  symbol?: string
  url?: string
  description?: string
  twitter?: string
  github?: string
  cmcId?: string | number | null
  gecko_id?: string | null
  governanceID?: string | null
  treasury?: any
  audits?: number
  audit_note?: any
  audit_links?: any[]
  listedAt?: number
  hallmarks?: any[]
  previousNames?: string[] | null
  forkedFrom?: any[]
  methodology?: any
  methodologyURL?: string
  defaultChartView?: string | null
  linkedProtocols?: any[]
  oracles?: any
  oraclesBreakdown?: any
  wrongLiquidity?: boolean
  misrepresentedTokens?: boolean
  metrics: Record<string, MQ | MQByLabel>
}

const META_KEYS = [
  'id',
  'defillamaId',
  'name',
  'displayName',
  'protocolType',
  'parentProtocol',
  'module',
  'category',
  'logo',
  'chains',
  'chain',
  'address',
  'symbol',
  'url',
  'description',
  'twitter',
  'github',
  'cmcId',
  'gecko_id',
  'governanceID',
  'treasury',
  'audits',
  'audit_note',
  'audit_links',
  'listedAt',
  'hallmarks',
  'previousNames',
  'forkedFrom',
  'methodology',
  'methodologyURL',
  'defaultChartView',
  'linkedProtocols',
  'oracles',
  'oraclesBreakdown',
  'wrongLiquidity',
  'misrepresentedTokens',
]

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
  for (const [ts, val] of chart || []) {
    if (typeof ts !== 'number' || typeof val !== 'number') continue
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

function readJSONSafe(fp: string): any | null {
  try {
    const raw = fs.readFileSync(fp, 'utf-8')
    return JSON.parse(raw)
  } catch { return null }
}

function slugFromAllFile(filename: string) {
  return filename.endsWith('all') ? filename.slice(0, -3) : filename
}

function slugFromBlFile(filename: string) {
  if (filename.endsWith('-bl')) return filename.slice(0, -3)  // "...-bl" -> "..."
  if (filename.endsWith('bl')) return filename.slice(0, -2)    // "...bl"  -> "..."
  return filename
}

function findBuildDir(): string | null {
  const candidates = [
    path.resolve(process.cwd(), '.api2-cache/build'),
    path.resolve(process.cwd(), 'src/api2/.api2-cache/build'),
    path.resolve(__dirname, '../../.api2-cache/build'),
    path.resolve(__dirname, '../../../.api2-cache/build'),
    path.resolve(__dirname, '../../../../.api2-cache/build'),
  ]
  for (const p of candidates) if (fs.existsSync(p)) return p
  return null
}
function mergeMeta(target: ProtoOut, src: any) {
  if (!src || typeof src !== 'object') return
  for (const k of META_KEYS) {
    if ((target as any)[k] == null && src[k] != null) {
      ;(target as any)[k] = src[k]
    }
  }
  if (src.slug && (target as any).slugMeta == null) {
    (target as any).slugMeta = src.slug
  }
  if (!target.displayName && src.name) target.displayName = src.name
}

async function run() {
  try {
    const buildDir = findBuildDir()
    if (!buildDir) return

    const dimRoot = path.join(buildDir, 'dimensions')
    if (!fs.existsSync(dimRoot)) return

    const adapterTypes = fs
      .readdirSync(dimRoot)
      .filter((d) => {
        try { return fs.statSync(path.join(dimRoot, d)).isDirectory() } catch { return false }
      })

    for (const adapterType of adapterTypes) {
      const adapterPath = path.join(dimRoot, adapterType)

      const recordTypeDirs = fs
        .readdirSync(adapterPath)
        .filter((d) => /[a-z]+protocol$/i.test(d))
        .map((d) => ({ abbr: d.replace(/protocol$/i, ''), dir: path.join(adapterPath, d) }))

      if (!recordTypeDirs.length) continue

      const protoMap: Record<string, ProtoOut> = {}

      for (const { abbr, dir } of recordTypeDirs) {
        let files: string[] = []
        try { files = fs.readdirSync(dir) } catch { files = [] }

        const allFiles = files.filter((f) => f.endsWith('all'))
        for (const fname of allFiles) {
          const data = readJSONSafe(path.join(dir, fname))
          if (!data || !Array.isArray(data.totalDataChart) || data.totalDataChart.length === 0) continue

          const slug = slugFromAllFile(fname)
          if (!protoMap[slug]) {
            protoMap[slug] = {
              generatedAt: Math.floor(Date.now() / 1000),
              adapterType,
              slug,
              metrics: {},
            }
          }

          mergeMeta(protoMap[slug], data)

          const mq = rollupFromChart(data.totalDataChart)
          protoMap[slug].metrics[abbr] = mq
        }

        const blFiles = files.filter((f) => f.endsWith('bl') || f.endsWith('-bl'))
        const abbrBL = `${abbr}bl`
        for (const fname of blFiles) {
          const data = readJSONSafe(path.join(dir, fname))
          const series = data?.totalDataChartBreakdownLabel
          if (!Array.isArray(series) || series.length === 0) continue

          const slug = slugFromBlFile(fname)
          if (!protoMap[slug]) {
            protoMap[slug] = {
              generatedAt: Math.floor(Date.now() / 1000),
              adapterType,
              slug,
              metrics: {},
            }
          }

          mergeMeta(protoMap[slug], data)

          const mqLabel = rollupFromLabelChart(series)
          protoMap[slug].metrics[abbrBL] = mqLabel
        }
      }

      const now = Math.floor(Date.now() / 1000)
      for (const [slug, proto] of Object.entries(protoMap)) {
        proto.generatedAt = now
        if (!proto.displayName) proto.displayName = proto.name || slug
        await storeRouteData(`dimensions/aggregates/${adapterType}/${slug}`, proto)
      }
    }
  } catch {
  }
}

run()
  .catch(() => process.exit(1))
  .then(() => process.exit(0))
