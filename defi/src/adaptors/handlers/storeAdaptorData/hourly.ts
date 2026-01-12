import { AdapterType } from "../../data/types"
import { getHourlySlicesBulk } from "../../db-utils/db2"

export type HourlySlice = {
  timestamp: number
  id?: string
  data: any
  bl?: any
  blc?: any
  tb?: any
  tbl?: any
  tblc?: any
  timeS?: string
}

export type HourlyCache = Map<string, Map<number, HourlySlice>>

export async function buildHourlyCache({ adapterType, fromTimestamp, toTimestamp }: { adapterType: AdapterType, fromTimestamp: number, toTimestamp: number }): Promise<{ cache: HourlyCache, range: { from: number, to: number } }> {
  const rows = await getHourlySlicesBulk({ adapterType, fromTimestamp, toTimestamp })
  const cache: HourlyCache = new Map()
  rows.forEach((row: any) => {
    if (!row?.id || typeof row.timestamp !== 'number') return
    const perProtocol = cache.get(row.id) ?? new Map<number, HourlySlice>()
    perProtocol.set(row.timestamp, row)
    cache.set(row.id, perProtocol)
  })
  return { cache, range: { from: fromTimestamp, to: toTimestamp } }
}

export function getCachedSlices(params: { cache?: HourlyCache, cacheRange?: { from: number, to: number }, id: string, fromTimestamp: number, toTimestamp: number }): HourlySlice[] | undefined {
  const { cache, cacheRange, id, fromTimestamp, toTimestamp } = params
  if (!cache || !cacheRange) return undefined
  const withinRange = fromTimestamp >= cacheRange.from && toTimestamp <= cacheRange.to
  if (!withinRange) return undefined
  const perProtocol = cache.get(id)
  if (!perProtocol) return []
  const out: HourlySlice[] = []
  for (const [ts, row] of perProtocol.entries()) {
    if (ts < fromTimestamp || ts > toTimestamp) continue
    out.push(row)
  }
  return out.sort((a, b) => a.timestamp - b.timestamp)
}

type TokenInfo = {
  usdTvl?: number
  usdTokenBalances?: Record<string, number>
  rawTokenBalances?: Record<string, string | number>
}

export function buildTokenBreakdownsByLabel(params: { tokenBreakdown?: any, breakdownByLabel?: any, breakdownByLabelByChain?: any }): { tbl?: any, tblc?: any } {
  const { tokenBreakdown, breakdownByLabel, breakdownByLabelByChain } = params
  if (!tokenBreakdown || typeof tokenBreakdown !== 'object') return {}

  // tbl:  { [label]: { [metric]: TokenInfo } }
  // tblc: { [label]: { [chain]: { [metric]: TokenInfo } } }
  const tbl: any = {}
  const tblc: any = {}

  const weightsByMetricChain: Record<string, Record<string, Record<string, number>>> = {}

  if (breakdownByLabelByChain && typeof breakdownByLabelByChain === 'object') {
    for (const [metric, labelsAny] of Object.entries(breakdownByLabelByChain)) {
      const labels = labelsAny as any
      if (!labels || typeof labels !== 'object') continue

      for (const [label, chainsAny] of Object.entries(labels)) {
        const chains = chainsAny as any
        if (!chains || typeof chains !== 'object') continue

        for (const [chain, vAny] of Object.entries(chains)) {
          const v = Number(vAny) || 0
          if (v <= 0) continue
          weightsByMetricChain[metric] ??= {}
          weightsByMetricChain[metric][chain] ??= {}
          weightsByMetricChain[metric][chain][label] = (weightsByMetricChain[metric][chain][label] || 0) + v
        }
      }
    }
  } else if (breakdownByLabel && typeof breakdownByLabel === 'object') {
    for (const [metric, labelsAny] of Object.entries(breakdownByLabel)) {
      const labels = labelsAny as any
      if (!labels || typeof labels !== 'object') continue
      weightsByMetricChain[metric] ??= {}
      weightsByMetricChain[metric]['*'] ??= {}

      for (const [label, vAny] of Object.entries(labels)) {
        const v = Number(vAny) || 0
        if (v <= 0) continue
        weightsByMetricChain[metric]['*'][label] = (weightsByMetricChain[metric]['*'][label] || 0) + v
      }
    }
  }

  const addUsdTokenInfo = (dst: TokenInfo, src: TokenInfo, factor: number) => {
    if (typeof src.usdTvl === 'number') dst.usdTvl = (dst.usdTvl || 0) + src.usdTvl * factor

    if (src.usdTokenBalances && typeof src.usdTokenBalances === 'object') {
      dst.usdTokenBalances ??= {}
      for (const [token, usd] of Object.entries(src.usdTokenBalances)) {
        const v = typeof usd === 'number' ? usd : Number(usd)
        if (!Number.isFinite(v)) continue
        dst.usdTokenBalances[token] = (dst.usdTokenBalances[token] || 0) + v * factor
      }
    }
  }

  const addRaw = (dst: TokenInfo, token: string, raw: string | number) => {
    dst.rawTokenBalances ??= {}
    const prev = dst.rawTokenBalances[token]
    if (prev === undefined) {
      dst.rawTokenBalances[token] = raw
      return
    }
    if (typeof prev === 'number' && typeof raw === 'number') {
      dst.rawTokenBalances[token] = prev + raw
      return
    }
    dst.rawTokenBalances[token] = raw
  }

  const ensureTbl = (label: string, metric: string) => {
    tbl[label] ??= {}
    tbl[label][metric] ??= { usdTvl: 0, usdTokenBalances: {}, rawTokenBalances: {} }
    return tbl[label][metric] as TokenInfo
  }

  const ensureTblc = (label: string, chain: string, metric: string) => {
    tblc[label] ??= {}
    tblc[label][chain] ??= {}
    tblc[label][chain][metric] ??= { usdTvl: 0, usdTokenBalances: {}, rawTokenBalances: {} }
    return tblc[label][chain][metric] as TokenInfo
  }

  const getDominantLabel = (entries: [string, number][]) => {
    let bestLabel = entries[0][0]
    let best = entries[0][1]
    for (let i = 1; i < entries.length; i++) {
      const [l, w] = entries[i]
      if (w > best) {
        best = w
        bestLabel = l
      }
    }
    return bestLabel
  }

  for (const [chain, metricsAny] of Object.entries(tokenBreakdown)) {
    const metrics = metricsAny as any
    if (!metrics || typeof metrics !== 'object') continue

    for (const [metric, tokenInfoAny] of Object.entries(metrics)) {
      const tokenInfo = tokenInfoAny as TokenInfo
      if (!tokenInfo || typeof tokenInfo !== 'object') continue

      const weights =
        weightsByMetricChain[metric]?.[chain] ??
        weightsByMetricChain[metric]?.['*']

      if (!weights) continue

      const entries = Object.entries(weights)
        .map(([label, w]) => [label, Number(w) || 0] as [string, number])
        .filter(([, w]) => w > 0)

      if (!entries.length) continue

      const sum = entries.reduce((acc, [, w]) => acc + w, 0)
      if (!sum) continue

      for (const [label, w] of entries) {
        const factor = w / sum
        addUsdTokenInfo(ensureTbl(label, metric), tokenInfo, factor)
        addUsdTokenInfo(ensureTblc(label, String(chain), metric), tokenInfo, factor)
      }

      if (tokenInfo.rawTokenBalances && typeof tokenInfo.rawTokenBalances === 'object') {
        const dominantLabel = getDominantLabel(entries)

        for (const [token, rawAny] of Object.entries(tokenInfo.rawTokenBalances)) {
          if (rawAny === null || rawAny === undefined) continue

          if (typeof rawAny === 'number') {
            for (const [label, w] of entries) {
              const factor = w / sum
              addRaw(ensureTbl(label, metric), token, rawAny * factor)
              addRaw(ensureTblc(label, String(chain), metric), token, rawAny * factor)
            }
          } else {
            addRaw(ensureTbl(dominantLabel, metric), token, rawAny as any)
            addRaw(ensureTblc(dominantLabel, String(chain), metric), token, rawAny as any)
          }
        }
      }
    }
  }

  return {
    tbl: Object.keys(tbl).length ? tbl : undefined,
    tblc: Object.keys(tblc).length ? tblc : undefined,
  }
}

export function aggregateDailyFromHourlySlices(slices: HourlySlice[], recordTimestamp: number) {
  const aggregatedDaily: any = {}
  const dailyBreakdownByLabel: any = {}
  const dailyBreakdownByLabelByChain: any = {}
  const dailyTokenBreakdown: any = {}
  const dailyTokenBreakdownByLabel: any = {}
  const dailyTokenBreakdownByLabelByChain: any = {}

  const fullSlices: HourlySlice[] = []

  for (const slice of slices) {
    const sliceBl = (slice as any).bl ?? null
    const sliceBlc = (slice as any).blc ?? null
    const sliceTb = (slice as any).tb
    const sliceTbl = (slice as any).tbl
    const sliceTblc = (slice as any).tblc

    fullSlices.push(slice)

    if (sliceBl && typeof sliceBl === 'object') {
      for (const [metric, labelsAny] of Object.entries(sliceBl as any)) {
        const labels = labelsAny as Record<string, number>
        if (!dailyBreakdownByLabel[metric]) dailyBreakdownByLabel[metric] = {}
        const metricDst = dailyBreakdownByLabel[metric]
        for (const [label, value] of Object.entries(labels)) {
          metricDst[label] = (metricDst[label] || 0) + (value as number)
        }
      }
    }

    if (sliceBlc && typeof sliceBlc === 'object') {
      for (const [metric, labelsAny] of Object.entries(sliceBlc as any)) {
        const labels = labelsAny as Record<string, Record<string, number>>
        if (!dailyBreakdownByLabelByChain[metric]) dailyBreakdownByLabelByChain[metric] = {}
        const metricDst = dailyBreakdownByLabelByChain[metric]
        for (const [label, chainsAny] of Object.entries(labels)) {
          const chains = chainsAny as Record<string, number>
          if (!metricDst[label]) metricDst[label] = {}
          const labelDst = metricDst[label]
          for (const [chain, value] of Object.entries(chains)) {
            labelDst[chain] = (labelDst[chain] || 0) + (value as number)
          }
        }
      }
    }

    if (sliceTb && typeof sliceTb === 'object') {
      for (const [chain, metricsAny] of Object.entries(sliceTb as any)) {
        const metrics = metricsAny as any
        if (!dailyTokenBreakdown[chain]) dailyTokenBreakdown[chain] = {}
        const chainDst = dailyTokenBreakdown[chain]

        for (const [metric, tokenInfoAny] of Object.entries(metrics)) {
          const tokenInfo = tokenInfoAny as any
          if (!tokenInfo || typeof tokenInfo !== 'object') continue

          if (!chainDst[metric]) {
            chainDst[metric] = {
              usdTvl: 0,
              usdTokenBalances: {} as Record<string, number>,
              rawTokenBalances: {} as Record<string, string | number>,
            }
          }
          const dst = chainDst[metric]

          if (typeof tokenInfo.usdTvl === 'number')
            dst.usdTvl += tokenInfo.usdTvl

          if (tokenInfo.usdTokenBalances && typeof tokenInfo.usdTokenBalances === 'object') {
            for (const [token, usd] of Object.entries(tokenInfo.usdTokenBalances as Record<string, number>)) {
              dst.usdTokenBalances[token] = (dst.usdTokenBalances[token] || 0) + (usd as number)
            }
          }

          if (tokenInfo.rawTokenBalances && typeof tokenInfo.rawTokenBalances === 'object') {
            for (const [token, raw] of Object.entries(tokenInfo.rawTokenBalances as Record<string, string | number>)) {
              const prev = dst.rawTokenBalances[token]
              if (prev === undefined) {
                dst.rawTokenBalances[token] = raw as any
              } else {
                if (typeof prev === 'number' && typeof raw === 'number') {
                  dst.rawTokenBalances[token] = prev + raw
                } else {
                  dst.rawTokenBalances[token] = raw as any
                }
              }
            }
          }
        }
      }
    }

    if (sliceTbl && typeof sliceTbl === 'object') {
      for (const [label, metricsAny] of Object.entries(sliceTbl as any)) {
        const metrics = metricsAny as any
        if (!dailyTokenBreakdownByLabel[label]) dailyTokenBreakdownByLabel[label] = {}
        const labelDst = dailyTokenBreakdownByLabel[label]

        for (const [metric, tokenInfoAny] of Object.entries(metrics)) {
          const tokenInfo = tokenInfoAny as any
          if (!tokenInfo || typeof tokenInfo !== 'object') continue

          if (!labelDst[metric]) {
            labelDst[metric] = {
              usdTvl: 0,
              usdTokenBalances: {} as Record<string, number>,
              rawTokenBalances: {} as Record<string, string | number>,
            }
          }
          const dst = labelDst[metric]

          if (typeof tokenInfo.usdTvl === 'number')
            dst.usdTvl += tokenInfo.usdTvl

          if (tokenInfo.usdTokenBalances && typeof tokenInfo.usdTokenBalances === 'object') {
            for (const [token, usd] of Object.entries(tokenInfo.usdTokenBalances as Record<string, number>)) {
              dst.usdTokenBalances[token] = (dst.usdTokenBalances[token] || 0) + (usd as number)
            }
          }

          if (tokenInfo.rawTokenBalances && typeof tokenInfo.rawTokenBalances === 'object') {
            for (const [token, raw] of Object.entries(tokenInfo.rawTokenBalances as Record<string, string | number>)) {
              const prev = dst.rawTokenBalances[token]
              if (prev === undefined) {
                dst.rawTokenBalances[token] = raw as any
              } else if (typeof prev === 'number' && typeof raw === 'number') {
                dst.rawTokenBalances[token] = prev + raw
              } else {
                dst.rawTokenBalances[token] = raw as any
              }
            }
          }
        }
      }
    }

    if (sliceTblc && typeof sliceTblc === 'object') {
      for (const [label, chainsAny] of Object.entries(sliceTblc as any)) {
        const chains = chainsAny as any
        if (!dailyTokenBreakdownByLabelByChain[label]) dailyTokenBreakdownByLabelByChain[label] = {}
        const labelDst = dailyTokenBreakdownByLabelByChain[label]

        for (const [chain, metricsAny] of Object.entries(chains)) {
          const metrics = metricsAny as any
          if (!labelDst[chain]) labelDst[chain] = {}
          const chainDst = labelDst[chain]

          for (const [metric, tokenInfoAny] of Object.entries(metrics)) {
            const tokenInfo = tokenInfoAny as any
            if (!tokenInfo || typeof tokenInfo !== 'object') continue

            if (!chainDst[metric]) {
              chainDst[metric] = {
                usdTvl: 0,
                usdTokenBalances: {} as Record<string, number>,
                rawTokenBalances: {} as Record<string, string | number>,
              }
            }
            const dst = chainDst[metric]

            if (typeof tokenInfo.usdTvl === 'number')
              dst.usdTvl += tokenInfo.usdTvl

            if (tokenInfo.usdTokenBalances && typeof tokenInfo.usdTokenBalances === 'object') {
              for (const [token, usd] of Object.entries(tokenInfo.usdTokenBalances as Record<string, number>)) {
                dst.usdTokenBalances[token] = (dst.usdTokenBalances[token] || 0) + (usd as number)
              }
            }

            if (tokenInfo.rawTokenBalances && typeof tokenInfo.rawTokenBalances === 'object') {
              for (const [token, raw] of Object.entries(tokenInfo.rawTokenBalances as Record<string, string | number>)) {
                const prev = dst.rawTokenBalances[token]
                if (prev === undefined) {
                  dst.rawTokenBalances[token] = raw as any
                } else if (typeof prev === 'number' && typeof raw === 'number') {
                  dst.rawTokenBalances[token] = prev + raw
                } else {
                  dst.rawTokenBalances[token] = raw as any
                }
              }
            }
          }
        }
      }
    }
  }

  for (const slice of fullSlices) {
    const agg = slice.data || {}
    for (const [metric, metricDataAny] of Object.entries(agg)) {
      const metricData = metricDataAny as any
      if (!aggregatedDaily[metric]) aggregatedDaily[metric] = { value: 0, chains: {} as any }
      aggregatedDaily[metric].value += metricData.value || 0
      if (metricData.chains) {
        for (const [chain, val] of Object.entries(metricData.chains)) {
          aggregatedDaily[metric].chains[chain] = (aggregatedDaily[metric].chains[chain] || 0) + (val as number)
        }
      }
    }
  }

  const adaptorRecordV2JSON = {
    aggregated: aggregatedDaily,
    breakdownByLabel: Object.keys(dailyBreakdownByLabel).length ? dailyBreakdownByLabel : undefined,
    breakdownByLabelByChain: Object.keys(dailyBreakdownByLabelByChain).length ? dailyBreakdownByLabelByChain : undefined,
    timestamp: recordTimestamp,
  }

  const tb = Object.keys(dailyTokenBreakdown).length ? dailyTokenBreakdown : undefined
  const tbl = Object.keys(dailyTokenBreakdownByLabel).length ? dailyTokenBreakdownByLabel : undefined
  const tblc = Object.keys(dailyTokenBreakdownByLabelByChain).length ? dailyTokenBreakdownByLabelByChain : undefined

  const hourlySlicesForDebug = fullSlices.map(s => ({
    timestamp: s.timestamp,
    data: s.data,
    bl: s.bl,
    blc: s.blc,
    tb: s.tb,
    tbl: s.tbl,
    tblc: s.tblc,
  }))

  return { adaptorRecordV2JSON, tb, tbl, tblc, hourlySlicesForDebug }
}
