/**
 * Deterministic external-metric comparator.
 *
 * Compares numeric metrics extracted from two JSON sources (DefiLlama vs.
 * an external provider) and classifies the discrepancy as `ok | warning |
 * critical | missing` against configurable relative and absolute thresholds.
 *
 * Refs: DefiLlama/defillama-server#11830.
 */

/** Status of a single metric comparison. */
export type MetricComparisonStatus = "ok" | "warning" | "critical" | "missing"

/** A single metric value drawn from one provider. */
export interface MetricSample {
  provider: string
  entity: string
  metric: string
  value: number | null | undefined
  /** Unix epoch seconds, used for {@link MetricComparisonOptions.maxTimestampDriftSeconds}. */
  timestamp?: number
  url?: string
}

/** Tunable thresholds for {@link compareMetricSample}. */
export interface MetricComparisonOptions {
  /** Relative-diff threshold above which status becomes `warning`. Default: 0.10 (10%). */
  warningThreshold?: number
  /** Relative-diff threshold above which status becomes `critical`. Default: 0.25 (25%). */
  criticalThreshold?: number
  /** Absolute-diff threshold below which the comparison is suppressed as dust. Default: 0. */
  minAbsDiff?: number
  /** If both samples carry timestamps and they drift further than this, status becomes `warning`. */
  maxTimestampDriftSeconds?: number
}

/** Result of comparing one Llama sample with one external sample. */
export interface MetricComparisonResult {
  entity: string
  metric: string
  status: MetricComparisonStatus
  llamaProvider: string
  externalProvider: string
  llamaValue: number | null
  externalValue: number | null
  absoluteDiff: number | null
  /** `null` when both samples are exactly 0, or when either side is missing. */
  relativeDiff: number | null
  timestampDriftSeconds: number | null
  message: string
  llamaUrl?: string
  externalUrl?: string
}

/**
 * Extracts a value from a nested object using dot-separated path notation.
 *
 * Supports array indexing via numeric segments (e.g., `"data.0.tvl"`).
 *
 * **Limitation**: keys containing literal dots (e.g., `"uniswap.v3"`)
 * cannot be addressed and will return `undefined`. By design, to keep
 * parsing simple. Configs should target dot-free key shapes.
 *
 * @param input - Object to extract from.
 * @param path - Dot-separated key path. Empty string returns the input.
 * @returns The value at the path, or `undefined` if not found.
 */
export function valueAtPath(input: any, path: string): any {
  if (!path) return input

  return path.split(".").reduce((current, segment) => {
    if (current === null || current === undefined) return undefined
    if (Array.isArray(current) && /^\d+$/.test(segment))
      return current[Number(segment)]
    return current[segment]
  }, input)
}

/**
 * Like {@link valueAtPath} but coerces the result to a finite number.
 *
 * Returns `null` for `null`, `undefined`, empty string, NaN, Infinity,
 * or any non-numeric content.
 *
 * @param input - Object to extract from.
 * @param path - Dot-separated key path.
 * @returns A finite number, or `null` if the value is missing or non-numeric.
 */
export function numberAtPath(input: any, path: string): number | null {
  const value = valueAtPath(input, path)
  if (value === null || value === undefined || value === "") return null

  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Compares two metric samples and classifies the discrepancy.
 *
 * Status precedence:
 * 1. `missing` — either sample's value is non-finite or absent.
 * 2. `warning` — timestamps drift further than `maxTimestampDriftSeconds`.
 * 3. `ok` — absolute diff is below `minAbsDiff` (dust suppression).
 * 4. `critical` — relative diff is at or above `criticalThreshold`.
 * 5. `warning` — relative diff is at or above `warningThreshold`.
 * 6. `ok` — otherwise.
 *
 * Bug-fix note: the relative-diff denominator no longer has a `1` floor
 * (refs #11830 Bug #1) — sub-1 metrics now compare proportionally.
 * When both samples are exactly 0, `relativeDiff` is `null` and the
 * comparison is `ok`.
 *
 * @param llama - Sample from DefiLlama.
 * @param external - Sample from the external provider.
 * @param options - Tunable thresholds.
 * @returns Structured comparison result.
 */
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
    return result(
      llama,
      external,
      "warning",
      null,
      null,
      timestampDriftSeconds,
      "timestamps are outside allowed drift",
    )
  }

  if (!isUsableNumber(llama.value) || !isUsableNumber(external.value)) {
    return result(
      llama,
      external,
      "missing",
      null,
      null,
      timestampDriftSeconds,
      "missing metric value",
    )
  }

  const llamaValue = Number(llama.value)
  const externalValue = Number(external.value)
  const absoluteDiff = Math.abs(llamaValue - externalValue)
  const denominator = Math.max(Math.abs(llamaValue), Math.abs(externalValue))
  const relativeDiff = denominator === 0 ? null : absoluteDiff / denominator

  if (absoluteDiff < minAbsDiff) {
    return result(
      llama,
      external,
      "ok",
      absoluteDiff,
      relativeDiff,
      timestampDriftSeconds,
      "within absolute threshold",
    )
  }

  if (relativeDiff !== null) {
    if (relativeDiff >= criticalThreshold) {
      return result(
        llama,
        external,
        "critical",
        absoluteDiff,
        relativeDiff,
        timestampDriftSeconds,
        "outside critical threshold",
      )
    }

    if (relativeDiff >= warningThreshold) {
      return result(
        llama,
        external,
        "warning",
        absoluteDiff,
        relativeDiff,
        timestampDriftSeconds,
        "outside warning threshold",
      )
    }
  }

  return result(
    llama,
    external,
    "ok",
    absoluteDiff,
    relativeDiff,
    timestampDriftSeconds,
    relativeDiff === null
      ? "both values are zero"
      : "within threshold",
  )
}

/**
 * Formats an array of comparison results as a compact one-line-per-row
 * text report (backwards-compatible with PR #11850's output shape).
 *
 * @param results - Comparison results to render.
 * @returns Plain-text report (line-delimited).
 */
export function formatMetricComparisonReport(
  results: MetricComparisonResult[],
): string {
  if (!results.length) return "No metric comparisons were run."

  const flagged = results.filter((item) => item.status !== "ok")
  const header = `External metric comparison: ${flagged.length}/${results.length} flagged`
  const rows = flagged.length ? flagged : results

  return [
    header,
    ...rows.map((item) => {
      const diff =
        item.relativeDiff === null
          ? "n/a"
          : `${(item.relativeDiff * 100).toFixed(2)}%`
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

function getTimestampDrift(
  llama: MetricSample,
  external: MetricSample,
): number | null {
  if (llama.timestamp === undefined || external.timestamp === undefined)
    return null
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
