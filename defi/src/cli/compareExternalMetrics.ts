/**
 * CLI: external metric comparison.
 *
 * Reads a JSON config of comparisons (DefiLlama vs external providers),
 * fetches each unique URL exactly once, classifies discrepancies via
 * configurable thresholds, and emits a text report (always), plus
 * optional JSON / Markdown outputs and a Discord webhook post.
 *
 * Refs DefiLlama/defillama-server#11830.
 */

import fs from "fs"
import { sendMessage } from "../utils/discord"
import {
  ConfigSchema,
  runComparisons,
} from "../dataQuality/runComparisons"
import { formatMetricComparisonReport } from "../dataQuality/externalMetricComparison"
import {
  formatJsonReport,
  formatMarkdownReport,
} from "../dataQuality/reportFormatter"

interface CliFlags {
  dryRun: boolean
  json?: string
  md?: string
  config?: string
  help: boolean
}

const HELP = `Usage: compare-external-metrics [OPTIONS] [CONFIG]

Compares numeric metrics from DefiLlama against external providers,
classifying discrepancies (ok | warning | critical | missing) by
configurable thresholds. (refs DefiLlama/defillama-server#11830)

Arguments:
  CONFIG                            Path to JSON config (or use --config or env)

Options:
  --dry-run                         Skip Discord webhook posting
  --json <path>                     Write structured JSON report to <path>
  --md <path>                       Write Markdown report to <path>
  --config <path>                   Path to JSON config (alt to positional)
  --help, -h                        Show this help

Environment:
  EXTERNAL_METRIC_COMPARISON_CONFIG    Config path (alternative to args)
  EXTERNAL_METRIC_COMPARISON_WEBHOOK   Discord webhook URL

Exit codes:
  0   No critical results
  1   At least one critical result, or argument / config error

Examples:
  npm run compare-external-metrics -- --dry-run \\
    src/dataQuality/configs/llama-tvl-spot-check.json

  npm run compare-external-metrics -- --no-discord \\
    --json /tmp/report.json --md /tmp/report.md \\
    src/dataQuality/configs/llama-tvl-spot-check.json
`

function parseArgs(argv: string[]): CliFlags {
  const flags: CliFlags = { dryRun: false, help: false }
  const positional: string[] = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--dry-run") flags.dryRun = true
    else if (a === "--help" || a === "-h") flags.help = true
    else if (a === "--json") flags.json = argv[++i]
    else if (a === "--md") flags.md = argv[++i]
    else if (a === "--config") flags.config = argv[++i]
    else positional.push(a)
  }
  if (!flags.config && positional[0]) flags.config = positional[0]
  return flags
}

async function main(): Promise<void> {
  const flags = parseArgs(process.argv.slice(2))
  if (flags.help) {
    console.log(HELP)
    return
  }

  const configPath =
    flags.config ?? process.env.EXTERNAL_METRIC_COMPARISON_CONFIG
  if (!configPath) {
    console.error(HELP)
    process.exit(1)
  }

  let raw: unknown
  try {
    raw = JSON.parse(fs.readFileSync(configPath, "utf8"))
  } catch (e: any) {
    console.error(`Failed to read config '${configPath}': ${e.message}`)
    process.exit(1)
  }

  const parsed = ConfigSchema.safeParse(raw)
  if (!parsed.success) {
    console.error(`Invalid config '${configPath}':`)
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`)
    }
    process.exit(1)
  }

  const results = await runComparisons(parsed.data, {
    onFetchError: (url, error) => {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(`Fetch failed for ${url}: ${msg}`)
    },
  })

  const text = formatMetricComparisonReport(results)
  console.log(text)

  if (flags.json) fs.writeFileSync(flags.json, formatJsonReport(results))
  if (flags.md) fs.writeFileSync(flags.md, formatMarkdownReport(results))

  const webhook = process.env.EXTERNAL_METRIC_COMPARISON_WEBHOOK
  if (webhook && !flags.dryRun) {
    await sendMessage(text, webhook, true)
  } else if (flags.dryRun && webhook) {
    console.log("(dry-run: skipped Discord webhook)")
  }

  if (results.some((r) => r.status === "critical")) process.exitCode = 1
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
