require("dotenv").config();

import fetch from "node-fetch"
import * as sdk from "@defillama/sdk"
import { dailyTvl, dailyUsdTokensTvl } from "../../utils/getLastRecord"
import { getAllProtocolItems, initializeTVLCacheDB } from "../db"

// ── Config ──────────────────────────────────────────────────────────────────────
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY
const MIN_TVL = Number(process.env.TVL_SPIKE_MIN_TVL ?? 100_000)
const CHECK_FOR_ALL = process.env.CHECK_FOR_ALL === 'true' || false
const MIN_CHANGE_PCT_GLOBAL = Number(process.env.TVL_SPIKE_MIN_CHANGE_PCT_GLOBAL ?? 15)
const MIN_CHANGE_PCT_CHAIN = Number(process.env.TVL_SPIKE_MIN_CHANGE_PCT_CHAIN ?? 40)
const MIN_CHANGE_VALUE = Number(process.env.TVL_SPIKE_MIN_CHANGE_VALUE ?? 100_000)
const ES_INDEX = 'tvl-spike-detector'
const API_BASE = INTERNAL_API_KEY ? `https://pro-api.llama.fi/${INTERNAL_API_KEY}/api` : 'https://api.llama.fi'

// ─────────────────────────────────────────────────────────────────────────────────

type SpikeEvent = {
  type: 'spike' | 'drop'
  level: 'global' | 'chain'
  chain?: string
  startTimestamp: number
  endTimestamp: number
  durationDays: number
  preValue: number
  spikeValue: number
  postValue: number
  changePct: number
  changeValue: number
}

type TokenContribution = {
  token: string
  valueBefore: number
  valueDuring: number
  valueAfter: number
  changePct: number
  changeValue: number
}

type SpikeReport = {
  protocolId: string
  protocolName: string
  protocolSlug: string
  category: string
  currentTvl: number
  event: SpikeEvent
  tokens: TokenContribution[]
  score: number
  resolved: boolean
  comment: string
  detectedAt: number
}

async function fetchJSON(url: string): Promise<any> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.json()
}

function fmtNum(n: number): string {
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`
  return `${sign}$${abs.toFixed(0)}`
}

function fmtDate(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 10)
}

/**
 * Detect spikes/drops that fix themselves in a TVL series.
 * A "self-fixing" spike/drop means the value goes up/down significantly and then returns
 * to near-original levels within 1-7 days.
 */
function detectSelfFixingEvents(
  series: { SK: number; tvl: number; [chain: string]: number }[],
  level: 'global' | 'chain',
  chain?: string
): SpikeEvent[] {
  if (series.length < 3) return []

  const events: SpikeEvent[] = []
  const getValue = (item: any) => level === 'global' ? item.tvl : (item[chain!] ?? 0)

  // Sort by timestamp ascending
  const sorted = [...series].sort((a, b) => a.SK - b.SK)

  for (let i = 1; i < sorted.length - 1; i++) {
    const prev = getValue(sorted[i - 1])
    const curr = getValue(sorted[i])

    if (prev <= 0 || curr <= 0) continue

    const changePct = ((curr - prev) / prev) * 100
    const changeValue = Math.abs(curr - prev)

    // Check if this is a significant change
    const minPct = level === 'global' ? MIN_CHANGE_PCT_GLOBAL : MIN_CHANGE_PCT_CHAIN
    if (Math.abs(changePct) < minPct || changeValue < MIN_CHANGE_VALUE) continue

    const isSpike = changePct > 0
    const type = isSpike ? 'spike' : 'drop'

    // Look ahead 1-7 days to see if it fixes itself
    let fixedAt = -1
    const maxLookahead = Math.min(i + 8, sorted.length) // up to 7 days ahead (+ the spike day itself)

    for (let j = i + 1; j < maxLookahead; j++) {
      const futureVal = getValue(sorted[j])
      if (futureVal <= 0) continue

      // Consider it "fixed" if it returns to within 20% of the pre-spike value
      const recoveryPct = Math.abs((futureVal - prev) / prev) * 100
      if (recoveryPct < 20) {
        fixedAt = j
        break
      }
    }

    if (fixedAt === -1) continue // didn't fix itself

    const spikeSlice = sorted.slice(i, fixedAt + 1)
    const spikeValue = isSpike
      ? Math.max(...spikeSlice.map(getValue))
      : Math.min(...spikeSlice.map(getValue))

    const event: SpikeEvent = {
      type,
      level,
      chain,
      startTimestamp: sorted[i].SK,
      endTimestamp: sorted[fixedAt].SK,
      durationDays: Math.round((sorted[fixedAt].SK - sorted[i].SK) / 86400),
      preValue: prev,
      spikeValue,
      postValue: getValue(sorted[fixedAt]),
      changePct: Math.round(changePct * 100) / 100,
      changeValue: Math.round(changeValue),
    }

    events.push(event)

    // Skip ahead past this event to avoid double-counting
    i = fixedAt
  }

  return events
}

/**
 * Find which tokens caused a spike/drop by comparing USD token data before/during/after
 */
function findTokenContributions(
  usdTokenSeries: any[],
  event: SpikeEvent
): TokenContribution[] {
  const sorted = [...usdTokenSeries].sort((a, b) => a.SK - b.SK)

  // Find the records closest to before, during, and after the event
  let beforeRecord: any
  let afterRecord: any
  const duringRecords: any[] = []
  for (const record of sorted) {
    if (record.SK < event.startTimestamp) {
      beforeRecord = record
    } else if (record.SK <= event.endTimestamp) {
      duringRecords.push(record)
    } else {
      afterRecord = record
      break
    }
  }

  if (!beforeRecord || !duringRecords.length) return []

  // Get all token keys (exclude SK, PK, tvl)
  const tokenKeys = new Set<string>()
  const skipKeys = new Set(['SK', 'PK', 'tvl'])

  // Collect tokens from the chain or global level
  const getTokens = (record: any) => {
    if (event.level === 'chain' && event.chain) {
      const chainData = record[event.chain]
      if (chainData && typeof chainData === 'object') return chainData
      return {}
    }
    // For global, merge all chain token data
    const result: Record<string, number> = {}
    for (const [key, val] of Object.entries(record)) {
      if (skipKeys.has(key)) continue
      if (typeof val === 'object' && val !== null) {
        for (const [token, amount] of Object.entries(val as any)) {
          result[token] = (result[token] ?? 0) + (amount as number)
        }
      }
    }
    return result
  }

  const beforeTokens = getTokens(beforeRecord)

  // Pick the during record with the most extreme value
  const getTokensTotal = (record: any) => Object.values(getTokens(record)).reduce((s: number, v: any) => s + (v || 0), 0)
  let peakDuringRecord = duringRecords[0]
  let peakTotal = getTokensTotal(peakDuringRecord)
  for (let i = 1; i < duringRecords.length; i++) {
    const rec = duringRecords[i]
    const duringTotal = getTokensTotal(rec)
    if (event.type === 'spike' ? duringTotal > peakTotal : duringTotal < peakTotal) {
      peakDuringRecord = rec
      peakTotal = duringTotal
    }
  }
  const duringTokens = getTokens(peakDuringRecord)
  const afterTokens = afterRecord ? getTokens(afterRecord) : beforeTokens

  // Collect all token names
  for (const key of Object.keys(beforeTokens)) tokenKeys.add(key)
  for (const key of Object.keys(duringTokens)) tokenKeys.add(key)

  const contributions: TokenContribution[] = []

  for (const token of tokenKeys) {
    const valueBefore = beforeTokens[token] ?? 0
    const valueDuring = duringTokens[token] ?? 0
    const valueAfter = afterTokens[token] ?? 0

    const tokenChange = valueDuring - valueBefore
    const tokenChangePct = valueBefore > 0 ? (tokenChange / valueBefore) * 100 : (valueDuring > 0 ? 100 : 0)

    // Only include tokens that had a significant change
    if (Math.abs(tokenChange) < 1000 && Math.abs(tokenChangePct) < 5) continue

    contributions.push({
      token,
      valueBefore: Math.round(valueBefore),
      valueDuring: Math.round(valueDuring),
      valueAfter: Math.round(valueAfter),
      changePct: Math.round(tokenChangePct * 100) / 100,
      changeValue: Math.round(tokenChange),
    })
  }

  // Sort by absolute change value descending
  contributions.sort((a, b) => Math.abs(b.changeValue) - Math.abs(a.changeValue))
  return contributions.slice(0, 10) // top 10 contributing tokens
}

/**
 * Check if an event is already reported in elasticsearch
 */
async function isAlreadyReported(protocolId: string, event: SpikeEvent): Promise<boolean> {
  try {
    const date = new Date()
    const indexPattern = `${ES_INDEX}-${date.getUTCFullYear()}-*`

    const result = await sdk.elastic.search({
      index: indexPattern,
      body: {
        query: {
          bool: {
            must: [
              { term: { 'protocolId.keyword': protocolId } },
              { term: { 'event.startTimestamp': event.startTimestamp } },
              { term: { 'event.type.keyword': event.type } },
              ...(event.chain ? [{ term: { 'event.chain.keyword': event.chain } }] : []),
            ]
          }
        },
        size: 1,
      }
    })

    return (result.hits?.total as any)?.value > 0
  } catch (e: any) {
    // If index doesn't exist yet or search fails, treat as not reported
    if (e.message?.includes('not configured')) return false
    console.log(`  [ES] Search failed (treating as not reported): ${e.message}`)
    return false
  }
}

function computeScore(events: SpikeReport[]): number {
  if (!events.length) return 0
  const count = events.length
  const totalValue = events.reduce((sum, e) => sum + Math.abs(e.event.changeValue), 0)
  return Math.round(count * (totalValue / 1e6)) // spikes * value in millions
}

export async function detectSpikesForProtocol(
  protocolName: string,
  protocolId: string,
  protocolSlug: string,
  currentTvl: number,
  category: string,
  { verbose = false, dryRun = false }: { verbose?: boolean; dryRun?: boolean } = {}
): Promise<SpikeReport[]> {
  const reports: SpikeReport[] = []

  if (verbose) console.log(`\n── Analyzing: ${protocolName} (id: ${protocolId}, tvl: ${fmtNum(currentTvl)}) ──`)

  // Step 1: Pull daily TVL history from postgres cache
  if (verbose) console.log(`  [1/4] Pulling daily TVL history...`)
  await initializeTVLCacheDB()
  const tvlHistory = await getAllProtocolItems(dailyTvl, protocolId)
  if (verbose) console.log(`  Got ${tvlHistory.length} daily TVL records`)

  if (tvlHistory.length < 3) {
    if (verbose) console.log(`  Skipping: not enough data points`)
    return []
  }

  // Step 2: Detect self-fixing spikes/drops at global level
  if (verbose) console.log(`  [2/4] Detecting global-level spikes/drops...`)
  const globalEvents = detectSelfFixingEvents(tvlHistory, 'global')
  if (verbose) console.log(`  Found ${globalEvents.length} global events`)

  // Step 3: Detect chain-level spikes/drops
  if (verbose) console.log(`  [3/4] Detecting chain-level spikes/drops...`)
  const chains = new Set<string>()
  const skipKeys = new Set(['SK', 'PK', 'tvl'])
  for (const record of tvlHistory) {
    for (const key of Object.keys(record)) {
      if (!skipKeys.has(key) && typeof record[key] === 'number') {
        chains.add(key)
      }
    }
  }

  const chainEvents: SpikeEvent[] = []
  for (const chain of chains) {
    const events = detectSelfFixingEvents(tvlHistory, 'chain', chain)
    chainEvents.push(...events)
  }
  if (verbose) console.log(`  Found ${chainEvents.length} chain-level events across ${chains.size} chains`)

  const allEvents = [...globalEvents, ...chainEvents]
  if (allEvents.length === 0) {
    if (verbose) console.log(`  No spikes/drops found`)
    return []
  }

  // Step 4: Pull USD token data to identify contributing tokens
  if (verbose) console.log(`  [4/4] Pulling USD token data for token analysis...`)
  let usdTokenHistory: any[] = []
  try {
    usdTokenHistory = await getAllProtocolItems(dailyUsdTokensTvl, protocolId)
    if (verbose) console.log(`  Got ${usdTokenHistory.length} USD token records`)
  } catch (e: any) {
    if (verbose) console.log(`  Warning: Could not pull USD token data: ${e.message}`)
  }

  // Process each event
  for (const event of allEvents) {
    // Check duplicate before writing
    const alreadyReported = dryRun ? false : await isAlreadyReported(protocolId, event)
    if (alreadyReported) {
      if (verbose) console.log(`  [skip] Already reported: ${event.type} at ${fmtDate(event.startTimestamp)} (${event.level}${event.chain ? '/' + event.chain : ''})`)
      continue
    }

    const tokens = usdTokenHistory.length > 0
      ? findTokenContributions(usdTokenHistory, event)
      : []

    const report: SpikeReport = {
      protocolId,
      protocolName,
      protocolSlug,
      category,
      currentTvl,
      event,
      tokens,
      score: 0,
      resolved: false,
      comment: '',
      detectedAt: Math.floor(Date.now() / 1000),
    }

    reports.push(report)
  }

  // Compute scores
  const score = computeScore(reports)
  reports.forEach(r => r.score = score)

  // Write to elasticsearch
  if (!dryRun) {
    for (const report of reports) {
      try {
        await sdk.elastic.writeLog(ES_INDEX, report as any)
      } catch (e: any) {
        console.log(`  [ES] Failed to write: ${e.message}`)
      }
    }
    if (verbose) console.log(`  Wrote ${reports.length} events to elasticsearch`)
  }

  // Print summary
  if (verbose) {
    for (const report of reports) {
      const e = report.event
      const tokenSummary = report.tokens.slice(0, 3).map(t => `${t.token}(${fmtNum(t.changeValue)})`).join(', ')
      console.log(`  ${e.type.toUpperCase()} [${e.level}${e.chain ? '/' + e.chain : ''}] ${fmtDate(e.startTimestamp)} -> ${fmtDate(e.endTimestamp)} (${e.durationDays}d) | ${e.changePct}% | ${fmtNum(e.changeValue)} | tokens: ${tokenSummary || 'n/a'}`)
    }
    console.log(`  Score: ${score}`)
  }

  return reports
}

/**
 * Run detection for all protocols (fetched from API)
 */
export async function runAllProtocols({ verbose = false, dryRun = false } = {}) {
  console.log(`TVL Spike Detector - Config: minTvl=${fmtNum(MIN_TVL)}, globalMin=${MIN_CHANGE_PCT_GLOBAL}%, chainMin=${MIN_CHANGE_PCT_CHAIN}%, minValue=${fmtNum(MIN_CHANGE_VALUE)}`)

  const protocols = await fetchJSON(`${API_BASE}/protocols`)
  console.log(`Fetched ${protocols.length} protocols`)

  const filtered = protocols.filter((p: any) => CHECK_FOR_ALL || p.tvl >= MIN_TVL)
  console.log(`${filtered.length} protocols above ${fmtNum(MIN_TVL)} TVL threshold`)

  let totalEvents = 0

  for (const protocol of filtered) {
    try {
      const reports = await detectSpikesForProtocol(
        protocol.name,
        String(protocol.id),
        protocol.slug,
        protocol.tvl,
        protocol.category || '',
        { verbose, dryRun }
      )
      totalEvents += reports.length
    } catch (e: any) {
      console.error(`  Error processing ${protocol.name}: ${e.message}`)
    }
  }

  console.log(`\nDone. Total new events found: ${totalEvents}`)
}

// CLI entry point - run for a single protocol by name, or all protocols if none specified
if (require.main === module) {
  const protocolArg = process.argv[2]

  async function main() {
    console.log(`Config: minTvl=${fmtNum(MIN_TVL)}, globalMin=${MIN_CHANGE_PCT_GLOBAL}%, chainMin=${MIN_CHANGE_PCT_CHAIN}%, minValue=${fmtNum(MIN_CHANGE_VALUE)}\n`)

    if (!protocolArg) {
      // No protocol specified - run for all protocols
      await runAllProtocols({ verbose: true, dryRun: false })
      process.exit(0)
    }

    // Single protocol mode
    console.log(`Testing spike detection for: "${protocolArg}"`)

    const protocols = await fetchJSON(`${API_BASE}/protocols`)
    const protocol = protocols.find((p: any) =>
      p.name.toLowerCase() === protocolArg.toLowerCase() ||
      p.slug?.toLowerCase() === protocolArg.toLowerCase()
    )

    if (!protocol) {
      console.error(`Protocol "${protocolArg}" not found`)
      process.exit(1)
    }

    console.log(`Found: ${protocol.name} (id: ${protocol.id}, slug: ${protocol.slug}, tvl: ${fmtNum(protocol.tvl)})`)

    const reports = await detectSpikesForProtocol(
      protocol.name,
      String(protocol.id),
      protocol.slug,
      protocol.tvl,
      protocol.category || '',
      { verbose: true, dryRun: true }
    )

    if (reports.length === 0) {
      console.log('\nNo self-fixing spikes/drops detected.')
    } else {
      console.log(`\n${'='.repeat(80)}`)
      console.log(`SUMMARY: ${reports.length} events detected for ${protocol.name}`)
      console.log(`${'='.repeat(80)}`)

      for (const report of reports) {
        const e = report.event
        console.log(`\n${e.type.toUpperCase()} [${e.level}${e.chain ? '/' + e.chain : ''}]`)
        console.log(`  Period: ${fmtDate(e.startTimestamp)} -> ${fmtDate(e.endTimestamp)} (${e.durationDays} days)`)
        console.log(`  Pre-value: ${fmtNum(e.preValue)} | Peak: ${fmtNum(e.spikeValue)} | Post: ${fmtNum(e.postValue)}`)
        console.log(`  Change: ${e.changePct}% (${fmtNum(e.changeValue)})`)

        if (report.tokens.length > 0) {
          console.log(`  Contributing tokens:`)
          for (const t of report.tokens) {
            console.log(`    ${t.token}: ${fmtNum(t.valueBefore)} -> ${fmtNum(t.valueDuring)} -> ${fmtNum(t.valueAfter)} (${t.changePct}%, ${fmtNum(t.changeValue)})`)
          }
        }
      }
    }

    process.exit(0)
  }

  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
