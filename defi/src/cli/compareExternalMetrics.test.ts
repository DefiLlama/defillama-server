import { parseArgs } from "./compareExternalMetrics"

describe("parseArgs", () => {
  test("parses dry-run, output paths, and positional config", () => {
    expect(
      parseArgs([
        "--dry-run",
        "--json",
        "/tmp/report.json",
        "--md",
        "/tmp/report.md",
        "src/dataQuality/configs/llama-tvl-spot-check.json",
      ]),
    ).toEqual({
      dryRun: true,
      help: false,
      json: "/tmp/report.json",
      md: "/tmp/report.md",
      config: "src/dataQuality/configs/llama-tvl-spot-check.json",
    })
  })

  test("--config takes precedence over positional config", () => {
    expect(parseArgs(["--config", "flag.json", "pos.json"])).toEqual({
      dryRun: false,
      help: false,
      config: "flag.json",
    })
  })

  test("sets help for both help aliases", () => {
    expect(parseArgs(["-h"]).help).toBe(true)
    expect(parseArgs(["--help"]).help).toBe(true)
  })

  test("throws for unknown options instead of treating them as config paths", () => {
    expect(() => parseArgs(["--no-discord"])).toThrow(
      /Unknown option: --no-discord/,
    )
    expect(() => parseArgs(["--josn", "/tmp/report.json"])).toThrow(
      /Unknown option: --josn/,
    )
  })

  test("throws when value-taking options are missing values", () => {
    expect(() => parseArgs(["--json"])).toThrow(/Missing value for --json/)
    expect(() => parseArgs(["--md", "--dry-run"])).toThrow(
      /Missing value for --md/,
    )
    expect(() => parseArgs(["--config", "--json"])).toThrow(
      /Missing value for --config/,
    )
  })
})
