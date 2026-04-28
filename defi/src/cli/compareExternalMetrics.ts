/**
 * Compare numeric metrics from DefiLlama JSON endpoints against external providers (same metric path shape).
 *
 * Config JSON shape:
 * { "comparisons": [{ entity, metric, llamaUrl, llamaPath, externalProvider, externalUrl, externalPath,
 *    warningThreshold?, criticalThreshold?, minAbsDiff?, maxTimestampDriftSeconds? }] }
 *
 * Env:
 * - EXTERNAL_METRIC_COMPARISON_CONFIG — path to JSON when no CLI arg is passed
 * - EXTERNAL_METRIC_COMPARISON_WEBHOOK — Discord webhook (omit or use --dry-run to skip posting)
 *
 * Related: DefiLlama/defillama-server#11830 (deterministic comparison layer before AI triage).
 */
import fs from "fs"
import fetch from "node-fetch"
import { sendMessage } from "../utils/discord"
import {
  compareMetricSample,
  formatMetricComparisonReport,
  MetricComparisonOptions,
  numberAtPath,
} from "../dataQuality/externalMetricComparison"

type MetricComparisonConfig = MetricComparisonOptions & {
  entity: string
  metric: string
  llamaUrl: string
  llamaPath: string
  externalProvider: string
  externalUrl: string
  externalPath: string
}

type ConfigFile = {
  comparisons: MetricComparisonConfig[]
}

function parseArgs(argv: string[]) {
  let dryRun = false
  const rest: string[] = []
  for (const a of argv) {
    if (a === "--dry-run") dryRun = true
    else rest.push(a)
  }
  return { dryRun, positional: rest }
}

async function main() {
  const { dryRun, positional } = parseArgs(process.argv.slice(2))
  const configPath = positional[0] ?? process.env.EXTERNAL_METRIC_COMPARISON_CONFIG
  if (!configPath) {
    throw new Error(
      "Usage: npx ts-node src/cli/compareExternalMetrics.ts [--dry-run] <config.json>\n" +
        "Or set EXTERNAL_METRIC_COMPARISON_CONFIG to the JSON path.",
    )
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as ConfigFile
  const results = []

  for (const comparison of config.comparisons) {
    const [llamaPayload, externalPayload] = await Promise.all([
      fetchJson(comparison.llamaUrl),
      fetchJson(comparison.externalUrl),
    ])

    results.push(
      compareMetricSample(
        {
          provider: "llama",
          entity: comparison.entity,
          metric: comparison.metric,
          value: numberAtPath(llamaPayload, comparison.llamaPath),
          url: comparison.llamaUrl,
        },
        {
          provider: comparison.externalProvider,
          entity: comparison.entity,
          metric: comparison.metric,
          value: numberAtPath(externalPayload, comparison.externalPath),
          url: comparison.externalUrl,
        },
        comparison,
      ),
    )
  }

  const report = formatMetricComparisonReport(results)
  console.log(report)

  const webhook = process.env.EXTERNAL_METRIC_COMPARISON_WEBHOOK
  if (webhook && !dryRun) {
    await sendMessage(report, webhook, true)
  } else if (dryRun && webhook) {
    console.log("(dry-run: skipped Discord webhook)")
  }

  if (results.some((item) => item.status === "critical")) process.exitCode = 1
}

async function fetchJson(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
  return response.json()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
