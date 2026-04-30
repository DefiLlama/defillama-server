import {
  compareMetricSample,
  formatMetricComparisonReport,
  numberAtPath,
} from "./externalMetricComparison"

describe("external metric comparison", () => {
  test("extracts nested numeric values", () => {
    expect(numberAtPath({ data: [{ metrics: { fees: "123.45" } }] }, "data.0.metrics.fees")).toBe(123.45)
    expect(numberAtPath({ data: { fees: "" } }, "data.fees")).toBeNull()
    expect(numberAtPath({ data: { fees: "bad" } }, "data.fees")).toBeNull()
  })

  test("marks small deviations as ok", () => {
    const result = compareMetricSample(
      { provider: "llama", entity: "aave", metric: "fees_24h", value: 100 },
      { provider: "external", entity: "aave", metric: "fees_24h", value: 94 },
      { warningThreshold: 0.1, criticalThreshold: 0.25 },
    )

    expect(result.status).toBe("ok")
    expect(result.relativeDiff).toBeCloseTo(0.06)
  })

  test("marks larger deviations by threshold", () => {
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
    const result = compareMetricSample(
      { provider: "llama", entity: "small-protocol", metric: "fees_24h", value: 2 },
      { provider: "external", entity: "small-protocol", metric: "fees_24h", value: 1 },
      { minAbsDiff: 10 },
    )

    expect(result.status).toBe("ok")
  })

  test("formats a compact report", () => {
    const result = compareMetricSample(
      { provider: "llama", entity: "aave", metric: "fees_24h", value: 100 },
      { provider: "external", entity: "aave", metric: "fees_24h", value: 50 },
      { criticalThreshold: 0.25 },
    )

    expect(formatMetricComparisonReport([result])).toContain("CRITICAL | aave | fees_24h")
  })
})
