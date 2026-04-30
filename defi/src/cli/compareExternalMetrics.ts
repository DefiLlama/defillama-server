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

async function main() {
  const configPath = process.argv[2] ?? process.env.EXTERNAL_METRIC_COMPARISON_CONFIG
  if (!configPath) throw new Error("Usage: ts-node src/cli/compareExternalMetrics.ts <config.json>")

  const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as ConfigFile
  const results = []

  for (const comparison of config.comparisons) {
    const [llamaPayload, externalPayload] = await Promise.all([
      fetchJson(comparison.llamaUrl),
      fetchJson(comparison.externalUrl),
    ])

    results.push(compareMetricSample(
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
    ))
  }

  const report = formatMetricComparisonReport(results)
  console.log(report)

  if (process.env.EXTERNAL_METRIC_COMPARISON_WEBHOOK) {
    await sendMessage(report, process.env.EXTERNAL_METRIC_COMPARISON_WEBHOOK, true)
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
