/**
 * Report formatters for {@link MetricComparisonResult} arrays.
 *
 * Provides:
 * - {@link formatJsonReport} — stable machine-readable JSON with schema
 *   versioning and a summary counts block.
 * - {@link formatMarkdownReport} — human-readable Markdown with linked
 *   sources, intended for PR descriptions and curated sample reports.
 *
 * The plain-text one-line-per-row formatter lives in
 * {@link ./externalMetricComparison.formatMetricComparisonReport} and is
 * kept there to preserve backwards-compatibility with PR #11850's output.
 */

import { MetricComparisonResult } from "./externalMetricComparison"

/** Schema version of the JSON report format. Bump on incompatible changes. */
export const REPORT_SCHEMA_VERSION = "1.0.0"

/** Counts of comparison results by status. */
export interface ReportSummary {
  total: number
  ok: number
  warning: number
  critical: number
  missing: number
}

/** Top-level shape of a JSON report. Useful for downstream consumers. */
export interface JsonReport {
  schema_version: string
  generated_at: string
  summary: ReportSummary
  results: MetricComparisonResult[]
}

/**
 * Aggregates an array of comparison results into status counts.
 *
 * @param results - Comparison results to summarize.
 * @returns Counts of each status plus total.
 */
export function summarize(results: MetricComparisonResult[]): ReportSummary {
  const summary: ReportSummary = {
    total: results.length,
    ok: 0,
    warning: 0,
    critical: 0,
    missing: 0,
  }
  for (const r of results) summary[r.status]++
  return summary
}

/**
 * Renders comparison results as pretty-printed JSON.
 *
 * Output matches the {@link JsonReport} shape and is stable:
 * downstream consumers can rely on `schema_version`, `generated_at`,
 * `summary` (counts), and `results` (verbatim array of input).
 *
 * @param results - Comparison results to render.
 * @returns Pretty-printed JSON string (2-space indent).
 */
export function formatJsonReport(results: MetricComparisonResult[]): string {
  const report: JsonReport = {
    schema_version: REPORT_SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    summary: summarize(results),
    results,
  }
  return JSON.stringify(report, null, 2)
}

/**
 * Renders comparison results as a human-readable Markdown report.
 *
 * Layout:
 * - Title + generation timestamp
 * - Summary table (counts by status)
 * - "Flagged Comparisons" section listing every non-ok result with
 *   linked sources, relative + absolute diff, and message
 * - "All clear" note if no flagged rows
 *
 * Intended for PR descriptions, GitHub-rendered sample reports, and
 * curated findings documents.
 *
 * @param results - Comparison results to render.
 * @returns Markdown string.
 */
export function formatMarkdownReport(
  results: MetricComparisonResult[],
): string {
  if (!results.length) return "No metric comparisons were run."

  const summary = summarize(results)
  const flagged = results.filter((r) => r.status !== "ok")

  const lines: string[] = [
    "# DefiLlama Data Quality Report",
    "",
    `**Generated:** ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `- **Total:** ${summary.total}`,
    `- **OK:** ${summary.ok}`,
    `- **Warning:** ${summary.warning}`,
    `- **Critical:** ${summary.critical}`,
    `- **Missing:** ${summary.missing}`,
    "",
  ]

  if (flagged.length === 0) {
    lines.push(
      "All comparisons are ok — no anomalies detected.",
      "",
    )
    return lines.join("\n")
  }

  lines.push("## Flagged Comparisons", "")

  for (const r of flagged) {
    lines.push(`### ${r.entity} / ${r.metric} — ${r.status.toUpperCase()}`, "")

    const llamaSrc = r.llamaUrl ? ` ([source](${r.llamaUrl}))` : ""
    const externalSrc = r.externalUrl ? ` ([source](${r.externalUrl}))` : ""

    lines.push(
      `- **DefiLlama (${r.llamaProvider}):** ${formatNumber(r.llamaValue)}${llamaSrc}`,
    )
    lines.push(
      `- **External (${r.externalProvider}):** ${formatNumber(r.externalValue)}${externalSrc}`,
    )

    lines.push(
      `- **Relative diff:** ${
        r.relativeDiff === null ? "n/a" : `${(r.relativeDiff * 100).toFixed(2)}%`
      }`,
    )

    if (r.absoluteDiff !== null) {
      lines.push(`- **Absolute diff:** ${formatNumber(r.absoluteDiff)}`)
    }

    if (r.timestampDriftSeconds !== null) {
      lines.push(`- **Timestamp drift:** ${r.timestampDriftSeconds}s`)
    }

    lines.push(`- **Message:** ${r.message}`, "")
  }

  return lines.join("\n")
}

/** Formats a number with k/m/b suffixes; returns "n/a" for null. */
function formatNumber(value: number | null): string {
  if (value === null) return "n/a"
  const abs = Math.abs(value)
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}b`
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}m`
  if (abs >= 1e3) return `${(value / 1e3).toFixed(2)}k`
  return `${Math.round(value * 100) / 100}`
}
