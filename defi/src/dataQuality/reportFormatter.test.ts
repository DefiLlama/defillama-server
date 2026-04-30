import { formatJsonReport, formatMarkdownReport } from "./reportFormatter"
import { MetricComparisonResult } from "./externalMetricComparison"

const ok: MetricComparisonResult = {
  entity: "aave",
  metric: "fees_24h",
  status: "ok",
  llamaProvider: "llama",
  externalProvider: "external",
  llamaValue: 100,
  externalValue: 105,
  absoluteDiff: 5,
  relativeDiff: 0.0476,
  timestampDriftSeconds: null,
  message: "within threshold",
  llamaUrl: "https://api.llama.fi/aave",
  externalUrl: "https://external.com/aave",
}

const critical: MetricComparisonResult = {
  entity: "uniswap",
  metric: "tvl",
  status: "critical",
  llamaProvider: "llama",
  externalProvider: "external",
  llamaValue: 1_000_000_000,
  externalValue: 500_000_000,
  absoluteDiff: 500_000_000,
  relativeDiff: 0.5,
  timestampDriftSeconds: null,
  message: "outside critical threshold",
  llamaUrl: "https://api.llama.fi/uniswap",
  externalUrl: "https://external.com/uniswap",
}

const warning: MetricComparisonResult = {
  entity: "compound",
  metric: "fees_24h",
  status: "warning",
  llamaProvider: "llama",
  externalProvider: "external",
  llamaValue: 100,
  externalValue: 80,
  absoluteDiff: 20,
  relativeDiff: 0.2,
  timestampDriftSeconds: 7200,
  message: "outside warning threshold",
  llamaUrl: "https://api.llama.fi/compound",
  externalUrl: "https://external.com/compound",
}

const missing: MetricComparisonResult = {
  entity: "x",
  metric: "y",
  status: "missing",
  llamaProvider: "llama",
  externalProvider: "external",
  llamaValue: null,
  externalValue: null,
  absoluteDiff: null,
  relativeDiff: null,
  timestampDriftSeconds: null,
  message: "missing metric value",
}

const zeroZero: MetricComparisonResult = {
  entity: "z",
  metric: "y",
  status: "ok",
  llamaProvider: "llama",
  externalProvider: "external",
  llamaValue: 0,
  externalValue: 0,
  absoluteDiff: 0,
  relativeDiff: null,
  timestampDriftSeconds: null,
  message: "both values are zero",
}

describe("formatJsonReport", () => {
  test("emits stable schema with summary counts", () => {
    const json = formatJsonReport([ok, critical, warning, missing, zeroZero])
    const parsed = JSON.parse(json)

    expect(parsed.schema_version).toBe("1.0.0")
    expect(parsed.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(parsed.summary).toEqual({
      total: 5,
      ok: 2,
      warning: 1,
      critical: 1,
      missing: 1,
    })
    expect(parsed.results).toHaveLength(5)
  })

  test("empty results yields zero counts and empty results array", () => {
    const parsed = JSON.parse(formatJsonReport([]))
    expect(parsed.summary).toEqual({
      total: 0,
      ok: 0,
      warning: 0,
      critical: 0,
      missing: 0,
    })
    expect(parsed.results).toHaveLength(0)
  })

  test("output is valid pretty-printed JSON", () => {
    const json = formatJsonReport([ok])
    expect(json).toContain("\n")
    expect(() => JSON.parse(json)).not.toThrow()
  })

  test("preserves all result fields verbatim", () => {
    const parsed = JSON.parse(formatJsonReport([critical]))
    expect(parsed.results[0]).toEqual(critical)
  })
})

describe("formatMarkdownReport", () => {
  test("includes header and summary section", () => {
    const md = formatMarkdownReport([ok, critical])
    expect(md).toMatch(/# DefiLlama Data Quality Report/)
    expect(md).toMatch(/## Summary/)
    expect(md).toMatch(/\*\*Total:\*\* 2/)
    expect(md).toMatch(/\*\*Critical:\*\* 1/)
    expect(md).toMatch(/\*\*OK:\*\* 1/)
  })

  test("flagged section lists critical/warning rows with linked sources", () => {
    const md = formatMarkdownReport([ok, critical])
    expect(md).toContain("## Flagged Comparisons")
    expect(md).toContain("uniswap / tvl")
    expect(md).toContain("CRITICAL")
    expect(md).toContain("[source](https://api.llama.fi/uniswap)")
    expect(md).toContain("[source](https://external.com/uniswap)")
    expect(md).toContain("50.00%")
  })

  test("renders n/a for null relativeDiff", () => {
    const md = formatMarkdownReport([missing])
    expect(md).toContain("MISSING")
    expect(md).toMatch(/Relative diff:.*n\/a/)
  })

  test("includes timestamp drift when present", () => {
    const md = formatMarkdownReport([warning])
    expect(md).toMatch(/Timestamp drift:.*7200s/)
  })

  test("when no flagged rows, emits an all-clear note", () => {
    const md = formatMarkdownReport([ok, zeroZero])
    expect(md).toMatch(/all comparisons are ok|no anomalies/i)
    expect(md).not.toContain("## Flagged")
  })

  test("handles empty results gracefully", () => {
    expect(formatMarkdownReport([])).toMatch(/no metric comparisons/i)
  })

  test("formats large numbers with k/m/b suffixes", () => {
    const md = formatMarkdownReport([critical])
    // critical has llamaValue 1_000_000_000 and externalValue 500_000_000
    expect(md).toContain("1.00b")
    expect(md).toContain("500.00m")
  })

  test("does not flag missing as ok", () => {
    const md = formatMarkdownReport([ok, missing])
    expect(md).toContain("MISSING")
    expect(md).toContain("## Flagged")
  })
})
