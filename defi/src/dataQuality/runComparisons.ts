/**
 * Pipeline that turns a {@link Config} into an array of
 * {@link MetricComparisonResult} via two passes:
 *
 *   Pass 1: collect every unique URL across all comparisons; resolve them
 *           in parallel through a {@link UrlPayloadCache}.
 *   Pass 2: synchronously map each comparison to a result by reading the
 *           prefetched payloads and calling {@link compareMetricSample}.
 *
 * The two-pass split is the fix for refs #11830 Bug #3 — every URL is
 * fetched exactly once per run, so two comparisons sharing an endpoint
 * cannot read different snapshots from it.
 *
 * Bug #2 (timestamp paths never wired) is fixed here too: the config now
 * carries optional `llamaTimestampPath` / `externalTimestampPath`, and
 * Pass 2 populates `MetricSample.timestamp` from those paths so that
 * `maxTimestampDriftSeconds` actually gates results.
 */

import { z } from "zod"
import {
  compareMetricSample,
  numberAtPath,
  MetricComparisonOptions,
  MetricComparisonResult,
} from "./externalMetricComparison"
import { UrlPayloadCache } from "./fetchWithRetry"

/** Zod schema for a single comparison entry. */
export const ComparisonConfigSchema = z.object({
  entity: z.string(),
  metric: z.string(),
  llamaUrl: z.string().url(),
  llamaPath: z.string(),
  /** Optional path for `llama` timestamp (refs #11830 Bug #2 fix). */
  llamaTimestampPath: z.string().optional(),
  externalProvider: z.string(),
  externalUrl: z.string().url(),
  externalPath: z.string(),
  /** Optional path for external timestamp (refs #11830 Bug #2 fix). */
  externalTimestampPath: z.string().optional(),
  warningThreshold: z.number().optional(),
  criticalThreshold: z.number().optional(),
  minAbsDiff: z.number().optional(),
  maxTimestampDriftSeconds: z.number().optional(),
})

/** Zod schema for a full config file. */
export const ConfigSchema = z.object({
  comparisons: z.array(ComparisonConfigSchema),
})

/** A single comparison entry. */
export type Comparison = z.infer<typeof ComparisonConfigSchema>

/** Top-level config (a list of comparisons). */
export type Config = z.infer<typeof ConfigSchema>

/** Options for {@link runComparisons}. */
export interface RunComparisonsOptions {
  /** Inject a cache (useful for testing or sharing across runs). */
  cache?: UrlPayloadCache
  /** Per-fetch retry / timeout options forwarded to the cache. */
  fetchOptions?: { retries?: number; backoffMs?: number; timeoutMs?: number }
  /** Callback invoked per failed URL (already isolated — batch continues). */
  onFetchError?: (url: string, error: unknown) => void
}

/**
 * Runs all comparisons declared in `config` and returns one result per entry.
 *
 * Failures are isolated: a fetch error makes the corresponding comparison's
 * value `null`, which produces a `missing` status for that row. Other rows
 * are unaffected.
 *
 * @param config - Validated config (use {@link ConfigSchema} to parse).
 * @param opts - Optional cache, fetch options, and error callback.
 * @returns Array of results, one per `comparisons[]` entry, in input order.
 */
export async function runComparisons(
  config: Config,
  opts: RunComparisonsOptions = {},
): Promise<MetricComparisonResult[]> {
  const cache = opts.cache ?? new UrlPayloadCache()

  // Pass 1: resolve every unique URL in parallel.
  const urls = [
    ...new Set(
      config.comparisons.flatMap((c) => [c.llamaUrl, c.externalUrl]),
    ),
  ]
  const settled = await Promise.allSettled(
    urls.map((u) => cache.get(u, opts.fetchOptions)),
  )
  const payloads = new Map<string, unknown | null>()
  for (let i = 0; i < urls.length; i++) {
    const r = settled[i]
    if (r.status === "fulfilled") {
      payloads.set(urls[i], r.value)
    } else {
      payloads.set(urls[i], null)
      opts.onFetchError?.(urls[i], r.reason)
    }
  }

  // Pass 2: synchronous compare per entry.
  return config.comparisons.map((c) => {
    const llamaPayload = payloads.get(c.llamaUrl) ?? null
    const externalPayload = payloads.get(c.externalUrl) ?? null

    const llamaTimestamp =
      c.llamaTimestampPath && llamaPayload !== null
        ? numberAtPath(llamaPayload, c.llamaTimestampPath) ?? undefined
        : undefined

    const externalTimestamp =
      c.externalTimestampPath && externalPayload !== null
        ? numberAtPath(externalPayload, c.externalTimestampPath) ?? undefined
        : undefined

    const options: MetricComparisonOptions = {
      warningThreshold: c.warningThreshold,
      criticalThreshold: c.criticalThreshold,
      minAbsDiff: c.minAbsDiff,
      maxTimestampDriftSeconds: c.maxTimestampDriftSeconds,
    }

    return compareMetricSample(
      {
        provider: "llama",
        entity: c.entity,
        metric: c.metric,
        value:
          llamaPayload === null ? null : numberAtPath(llamaPayload, c.llamaPath),
        timestamp: llamaTimestamp,
        url: c.llamaUrl,
      },
      {
        provider: c.externalProvider,
        entity: c.entity,
        metric: c.metric,
        value:
          externalPayload === null
            ? null
            : numberAtPath(externalPayload, c.externalPath),
        timestamp: externalTimestamp,
        url: c.externalUrl,
      },
      options,
    )
  })
}
