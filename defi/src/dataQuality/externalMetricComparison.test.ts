import {
  compareMetricSample,
  formatMetricComparisonReport,
  numberAtPath,
  valueAtPath,
} from "./externalMetricComparison"

describe("numberAtPath / valueAtPath", () => {
  test("extracts nested numeric values", () => {
    expect(
      numberAtPath({ data: [{ metrics: { fees: "123.45" } }] }, "data.0.metrics.fees"),
    ).toBe(123.45)
  })

  test("returns null for empty / non-numeric / missing", () => {
    expect(numberAtPath({ data: { fees: "" } }, "data.fees")).toBeNull()
    expect(numberAtPath({ data: { fees: "bad" } }, "data.fees")).toBeNull()
    expect(numberAtPath({}, "missing.path")).toBeNull()
  })

  test("supports array index segments", () => {
    expect(numberAtPath({ data: [{ tvl: 100 }] }, "data.0.tvl")).toBe(100)
  })

  test("treats NaN and Infinity as null (regression: usable-number guard)", () => {
    expect(numberAtPath({ x: NaN }, "x")).toBeNull()
    expect(numberAtPath({ x: Infinity }, "x")).toBeNull()
    expect(numberAtPath({ x: -Infinity }, "x")).toBeNull()
  })

  test("handles numeric strings with exponent notation", () => {
    expect(numberAtPath({ x: "1e3" }, "x")).toBe(1000)
  })

  test("dotted-key limitation is documented (returns null for `uniswap.v3` key)", () => {
    expect(numberAtPath({ "uniswap.v3": 5 }, "uniswap.v3")).toBeNull()
  })

  test("valueAtPath with empty path returns input", () => {
    expect(valueAtPath({ a: 1 }, "")).toEqual({ a: 1 })
  })
})

describe("compareMetricSample — bug fixes (regression tests)", () => {
  // Bug #1: denominator floor of `1` made sub-1 metrics misreport relative drift.
  test("0.5 vs 0.6 reports ~16.7% relative diff (regression: bug #1)", () => {
    const r = compareMetricSample(
      { provider: "llama", entity: "x", metric: "y", value: 0.5 },
      { provider: "external", entity: "x", metric: "y", value: 0.6 },
      { warningThreshold: 0.1, criticalThreshold: 0.25 },
    )
    expect(r.relativeDiff).toBeCloseTo(0.1667, 3)
    expect(r.status).toBe("warning")
  })

  test("0 vs 0 returns relativeDiff null with status ok", () => {
    const r = compareMetricSample(
      { provider: "llama", entity: "x", metric: "y", value: 0 },
      { provider: "external", entity: "x", metric: "y", value: 0 },
    )
    expect(r.relativeDiff).toBeNull()
    expect(r.status).toBe("ok")
  })

  test("0 vs 1 returns relativeDiff 1.0 critical", () => {
    const r = compareMetricSample(
      { provider: "llama", entity: "x", metric: "y", value: 0 },
      { provider: "external", entity: "x", metric: "y", value: 1 },
      { warningThreshold: 0.1, criticalThreshold: 0.25 },
    )
    expect(r.relativeDiff).toBeCloseTo(1.0)
    expect(r.status).toBe("critical")
  })
})

describe("compareMetricSample — thresholds and dust suppression", () => {
  test("marks small deviations (<warning) as ok", () => {
    const r = compareMetricSample(
      { provider: "llama", entity: "aave", metric: "fees_24h", value: 100 },
      { provider: "external", entity: "aave", metric: "fees_24h", value: 94 },
      { warningThreshold: 0.1, criticalThreshold: 0.25 },
    )
    expect(r.status).toBe("ok")
    expect(r.relativeDiff).toBeCloseTo(0.06)
  })

  test("warning at 20% drift, critical at 40% drift", () => {
    const warning = compareMetricSample(
      { provider: "llama", entity: "aave", metric: "fees_24h", value: 100 },
      { provider: "external", entity: "aave", metric: "fees_24h", value: 80 },
      { warningThreshold: 0.1, criticalThreshold: 0.25 },
    )
    const critical = compareMetricSample(
      { provider: "llama", entity: "aave", metric: "fees_24h", value: 100 },
      { provider: "external", entity: "aave", metric: "fees_24h", value: 60 },
      { warningThreshold: 0.1, criticalThreshold: 0.25 },
    )

    expect(warning.status).toBe("warning")
    expect(critical.status).toBe("critical")
  })

  test("uses absolute threshold to suppress dust", () => {
    const r = compareMetricSample(
      { provider: "llama", entity: "small", metric: "fees_24h", value: 2 },
      { provider: "external", entity: "small", metric: "fees_24h", value: 1 },
      { minAbsDiff: 10 },
    )
    expect(r.status).toBe("ok")
  })

  test("mixed signs: -50 vs 50 is a 200% relative drift (critical)", () => {
    const r = compareMetricSample(
      { provider: "llama", entity: "x", metric: "y", value: -50 },
      { provider: "external", entity: "x", metric: "y", value: 50 },
      { criticalThreshold: 0.25 },
    )
    expect(r.relativeDiff).toBeCloseTo(2.0)
    expect(r.status).toBe("critical")
  })

  test("non-finite values produce missing status", () => {
    const nanResult = compareMetricSample(
      { provider: "llama", entity: "x", metric: "y", value: NaN },
      { provider: "external", entity: "x", metric: "y", value: 100 },
    )
    const undefResult = compareMetricSample(
      { provider: "llama", entity: "x", metric: "y", value: undefined },
      { provider: "external", entity: "x", metric: "y", value: 100 },
    )
    expect(nanResult.status).toBe("missing")
    expect(undefResult.status).toBe("missing")
  })
})

describe("compareMetricSample — timestamp drift (regression: bug #2 prep)", () => {
  test("drift gating fires when timestamps are populated and exceed limit", () => {
    const r = compareMetricSample(
      { provider: "llama", entity: "x", metric: "y", value: 100, timestamp: 1000 },
      {
        provider: "external",
        entity: "x",
        metric: "y",
        value: 100,
        timestamp: 99_999,
      },
      { maxTimestampDriftSeconds: 600 },
    )
    expect(r.status).toBe("warning")
    expect(r.message).toMatch(/drift/i)
    expect(r.timestampDriftSeconds).toBe(98_999)
  })

  test("drift gating is silent when timestamps are absent", () => {
    const r = compareMetricSample(
      { provider: "llama", entity: "x", metric: "y", value: 100 },
      { provider: "external", entity: "x", metric: "y", value: 100 },
      { maxTimestampDriftSeconds: 600 },
    )
    expect(r.status).toBe("ok")
    expect(r.timestampDriftSeconds).toBeNull()
  })
})

describe("formatMetricComparisonReport", () => {
  test("renders a compact one-line-per-row report", () => {
    const r = compareMetricSample(
      { provider: "llama", entity: "aave", metric: "fees_24h", value: 100 },
      { provider: "external", entity: "aave", metric: "fees_24h", value: 50 },
      { criticalThreshold: 0.25 },
    )
    expect(formatMetricComparisonReport([r])).toContain(
      "CRITICAL | aave | fees_24h",
    )
  })

  test("'no comparisons' message when empty", () => {
    expect(formatMetricComparisonReport([])).toMatch(/no metric comparisons/i)
  })

  test("renders n/a for null relativeDiff", () => {
    const r = compareMetricSample(
      { provider: "llama", entity: "x", metric: "y", value: 0 },
      { provider: "external", entity: "x", metric: "y", value: 0 },
    )
    // 0 vs 0 is `ok`, so flagged is empty; report falls back to all rows.
    const out = formatMetricComparisonReport([r])
    expect(out).toContain("OK | x | y")
    expect(out).toContain("diff=n/a")
  })
})
