export type MetricComparisonStatus = "ok" | "warning" | "critical" | "missing"

export interface MetricSample {
  provider: string
  entity: string
  metric: string
  value: number | null | undefined
  timestamp?: number
  url?: string
}

export interface MetricComparisonOptions {
  warningThreshold?: number
  criticalThreshold?: number
  minAbsDiff?: number
  maxTimestampDriftSeconds?: number
}

export interface MetricComparisonResult {
  entity: string
  metric: string
  status: MetricComparisonStatus
  llamaProvider: string
  externalProvider: string
  llamaValue: number | null
  externalValue: number | null
  absoluteDiff: number | null
  relativeDiff: number | null
  timestampDriftSeconds: number | null
  message: string
  llamaUrl?: string
  externalUrl?: string
}

export function valueAtPath(input: any, path: string): any {
  if (!path) return input

  return path.split(".").reduce((current, segment) => {
    if (current === null || current === undefined) return undefined
    if (Array.isArray(current) && /^\d+$/.test(segment)) return current[Number(segment)]
    return current[segment]
  }, input)
}

export function numberAtPath(input: any, path: string): number | null {
  const value = valueAtPath(input, path)
  if (value === null || value === undefined || value === "") return null

  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function compareMetricSample(
  llama: MetricSample,
  external: MetricSample,
  options: MetricComparisonOptions = {},
): MetricComparisonResult {
  const warningThreshold = options.warningThreshold ?? 0.1
  const criticalThreshold = options.criticalThreshold ?? 0.25
  const minAbsDiff = options.minAbsDiff ?? 0

  const timestampDriftSeconds = getTimestampDrift(llama, external)
  if (
    timestampDriftSeconds !== null &&
    options.maxTimestampDriftSeconds !== undefined &&
    timestampDriftSeconds > options.maxTimestampDriftSeconds
  ) {
    return result(llama, external, "warning", null, null, timestampDriftSeconds, "timestamps are outside allowed drift")
  }

  if (!isUsableNumber(llama.value) || !isUsableNumber(external.value)) {
    return result(llama, external, "missing", null, null, timestampDriftSeconds, "missing metric value")
  }

  const llamaValue = Number(llama.value)
  const externalValue = Number(external.value)
  const absoluteDiff = Math.abs(llamaValue - externalValue)
  const denominator = Math.max(Math.abs(llamaValue), Math.abs(externalValue), 1)
  const relativeDiff = absoluteDiff / denominator

  if (absoluteDiff < minAbsDiff) {
    return result(llama, external, "ok", absoluteDiff, relativeDiff, timestampDriftSeconds, "within absolute threshold")
  }

  if (relativeDiff >= criticalThreshold) {
    return result(llama, external, "critical", absoluteDiff, relativeDiff, timestampDriftSeconds, "outside critical threshold")
  }

  if (relativeDiff >= warningThreshold) {
    return result(llama, external, "warning", absoluteDiff, relativeDiff, timestampDriftSeconds, "outside warning threshold")
  }

  return result(llama, external, "ok", absoluteDiff, relativeDiff, timestampDriftSeconds, "within threshold")
}

export function formatMetricComparisonReport(results: MetricComparisonResult[]): string {
  if (!results.length) return "No metric comparisons were run."

  const flagged = results.filter((item) => item.status !== "ok")
  const header = `External metric comparison: ${flagged.length}/${results.length} flagged`
  const rows = flagged.length ? flagged : results

  return [
    header,
    ...rows.map((item) => {
      const diff = item.relativeDiff === null ? "n/a" : `${(item.relativeDiff * 100).toFixed(2)}%`
      return [
        item.status.toUpperCase(),
        item.entity,
        item.metric,
        `${item.llamaProvider}=${formatValue(item.llamaValue)}`,
        `${item.externalProvider}=${formatValue(item.externalValue)}`,
        `diff=${diff}`,
        item.message,
      ].join(" | ")
    }),
  ].join("\n")
}

function result(
  llama: MetricSample,
  external: MetricSample,
  status: MetricComparisonStatus,
  absoluteDiff: number | null,
  relativeDiff: number | null,
  timestampDriftSeconds: number | null,
  message: string,
): MetricComparisonResult {
  return {
    entity: llama.entity,
    metric: llama.metric,
    status,
    llamaProvider: llama.provider,
    externalProvider: external.provider,
    llamaValue: isUsableNumber(llama.value) ? Number(llama.value) : null,
    externalValue: isUsableNumber(external.value) ? Number(external.value) : null,
    absoluteDiff,
    relativeDiff,
    timestampDriftSeconds,
    message,
    llamaUrl: llama.url,
    externalUrl: external.url,
  }
}

function getTimestampDrift(llama: MetricSample, external: MetricSample): number | null {
  if (llama.timestamp === undefined || external.timestamp === undefined) return null
  return Math.abs(llama.timestamp - external.timestamp)
}

function isUsableNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function formatValue(value: number | null): string {
  if (value === null) return "n/a"
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(2)}b`
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(2)}m`
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(2)}k`
  return `${Math.round(value * 100) / 100}`
}
