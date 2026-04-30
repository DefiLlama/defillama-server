# DefiLlama Data Quality — Sample Configs

Each `*.json` file in this directory is a config for the
`compare-external-metrics` CLI (refs DefiLlama/defillama-server#11830).

## Config schema

```jsonc
{
  "comparisons": [
    {
      "entity": "<readable-id>",          // e.g. "aave-v3-ethereum"
      "metric": "<metric-name>",          // e.g. "tvl_usd"
      "llamaUrl": "<url>",                // a DefiLlama JSON endpoint
      "llamaPath": "<dot.path>",          // e.g. "currentChainTvls.Ethereum"
      "llamaTimestampPath": "<dot.path>", // optional — wires drift gating
      "externalProvider": "<name>",       // e.g. "rekt-news"
      "externalUrl": "<url>",             // any external JSON endpoint
      "externalPath": "<dot.path>",
      "externalTimestampPath": "<dot.path>",
      "warningThreshold": 0.10,           // optional, default 0.10 (10% relative)
      "criticalThreshold": 0.25,          // optional, default 0.25 (25% relative)
      "minAbsDiff": 0,                    // optional — suppress dust below this
      "maxTimestampDriftSeconds": 3600    // optional — flag drift exceeding this
    }
  ]
}
```

## Running

```bash
# Deterministic comparison; print text to stdout, optionally write
# JSON / Markdown reports, optionally post a Discord webhook.
npm run compare-external-metrics -- --dry-run \
  --json /tmp/report.json --md /tmp/report.md \
  src/dataQuality/configs/llama-tvl-spot-check.json
```

Environment:

- `EXTERNAL_METRIC_COMPARISON_CONFIG` — config path (alternative to argv).
- `EXTERNAL_METRIC_COMPARISON_WEBHOOK` — Discord webhook URL.

## Provided configs

### `llama-tvl-spot-check.json` — smoke test

Compares Aave V3's Ethereum TVL on `/protocol/aave-v3` against itself
from the same endpoint. Always returns `ok` — its job is to prove the
CLI runs end to end against live DefiLlama data: fetch + URL cache + path
extraction + threshold logic + report formatting all wired up.

**To do real cross-source validation**, replace `externalUrl` and
`externalPath` with a non-DefiLlama provider's endpoint that publishes
the same metric (for example, a protocol's own public dashboard JSON if
they expose one). Numeric-string values are supported; deep nested paths
are supported; arrays can be indexed by numeric segment.

## Path syntax

`<dot.path>` supports nested object access and array indexing by numeric
segment:

- `data.tvl` → `obj["data"]["tvl"]`
- `data.0.tvl` → `obj["data"][0]["tvl"]`

**Limitation:** keys containing literal dots (e.g. `"uniswap.v3"`) cannot
be addressed — by design, to keep the parser tiny. Pick endpoints whose
JSON keys don't use dots.

## Adding a new config

1. Create `<name>.json` next to this README.
2. Verify the JSON path syntax against the live endpoint:
   ```bash
   curl -s "<URL>" | python3 -c 'import json,sys; \
     d=json.load(sys.stdin); \
     # walk d["foo"]["bar"]... by hand to confirm the value
   '
   ```
3. Add an entry above describing what the config compares and why.
4. Run with `--dry-run` first to confirm the report makes sense before
   wiring up a webhook.
