import fetch from "node-fetch"
import { runComparisons, Config } from "./runComparisons"

jest.mock("node-fetch", () => jest.fn())
const mockFetch = fetch as unknown as jest.Mock

const okResponse = (body: any) => ({
  ok: true,
  status: 200,
  statusText: "OK",
  json: async () => body,
})

const errResponse = (status: number) => ({
  ok: false,
  status,
  statusText: "err",
  json: async () => ({}),
  text: async () => "err",
})

describe("runComparisons (integration)", () => {
  beforeEach(() => mockFetch.mockReset())

  test("end-to-end: produces ok / warning / critical statuses by threshold", async () => {
    const config: Config = {
      comparisons: [
        {
          entity: "aave",
          metric: "fees_24h",
          llamaUrl: "https://llama.test/aave",
          llamaPath: "fees",
          externalProvider: "external",
          externalUrl: "https://external.test/aave",
          externalPath: "fees",
          warningThreshold: 0.1,
          criticalThreshold: 0.25,
        },
        {
          entity: "uniswap",
          metric: "tvl",
          llamaUrl: "https://llama.test/uniswap",
          llamaPath: "tvl",
          externalProvider: "external",
          externalUrl: "https://external.test/uniswap",
          externalPath: "tvl",
          warningThreshold: 0.1,
          criticalThreshold: 0.25,
        },
        {
          entity: "compound",
          metric: "tvl",
          llamaUrl: "https://llama.test/compound",
          llamaPath: "tvl",
          externalProvider: "external",
          externalUrl: "https://external.test/compound",
          externalPath: "tvl",
          warningThreshold: 0.1,
          criticalThreshold: 0.25,
        },
      ],
    }

    mockFetch.mockImplementation((url: string) => {
      if (url === "https://llama.test/aave") return okResponse({ fees: 100 })
      if (url === "https://external.test/aave")
        return okResponse({ fees: 105 }) // ~5% diff -> ok
      if (url === "https://llama.test/uniswap")
        return okResponse({ tvl: 1_000_000 })
      if (url === "https://external.test/uniswap")
        return okResponse({ tvl: 700_000 }) // 30% diff -> critical
      if (url === "https://llama.test/compound") return okResponse({ tvl: 100 })
      if (url === "https://external.test/compound")
        return okResponse({ tvl: 80 }) // 20% diff -> warning
      throw new Error(`unexpected url ${url}`)
    })

    const results = await runComparisons(config)

    expect(results).toHaveLength(3)
    expect(results[0].status).toBe("ok")
    expect(results[1].status).toBe("critical")
    expect(results[2].status).toBe("warning")
    expect(results[1].relativeDiff).toBeCloseTo(0.3, 2)
  })

  test("two-pass cache: each unique URL fetched exactly once even when comparisons share URLs (regression: bug #3)", async () => {
    const config: Config = {
      comparisons: [
        {
          entity: "shared-fees",
          metric: "fees",
          llamaUrl: "https://llama.test/shared",
          llamaPath: "fees_24h",
          externalProvider: "external",
          externalUrl: "https://external.test/a",
          externalPath: "value",
        },
        {
          entity: "shared-tvl",
          metric: "tvl",
          llamaUrl: "https://llama.test/shared", // SAME llama URL
          llamaPath: "tvl",
          externalProvider: "external",
          externalUrl: "https://external.test/b",
          externalPath: "value",
        },
      ],
    }

    mockFetch.mockImplementation((url: string) => {
      if (url === "https://llama.test/shared")
        return okResponse({ fees_24h: 100, tvl: 1000 })
      if (url === "https://external.test/a") return okResponse({ value: 100 })
      if (url === "https://external.test/b") return okResponse({ value: 1000 })
      throw new Error(`unexpected url ${url}`)
    })

    await runComparisons(config)

    // 3 unique URLs => 3 fetch calls (not 4)
    expect(mockFetch).toHaveBeenCalledTimes(3)

    const sharedHits = mockFetch.mock.calls.filter(
      (c) => c[0] === "https://llama.test/shared",
    )
    expect(sharedHits).toHaveLength(1)
  })

  test("timestamp paths populate timestamps and gate by drift (regression: bug #2)", async () => {
    const config: Config = {
      comparisons: [
        {
          entity: "x",
          metric: "y",
          llamaUrl: "https://llama.test/x",
          llamaPath: "value",
          llamaTimestampPath: "updatedAt",
          externalProvider: "external",
          externalUrl: "https://external.test/x",
          externalPath: "value",
          externalTimestampPath: "updatedAt",
          maxTimestampDriftSeconds: 600,
        },
      ],
    }

    mockFetch.mockImplementation((url: string) => {
      if (url === "https://llama.test/x")
        return okResponse({ value: 100, updatedAt: 1000 })
      if (url === "https://external.test/x")
        return okResponse({ value: 100, updatedAt: 99_999 })
      throw new Error(`unexpected url ${url}`)
    })

    const results = await runComparisons(config)

    expect(results[0].timestampDriftSeconds).toBe(98_999)
    expect(results[0].status).toBe("warning")
    expect(results[0].message).toMatch(/drift/i)
  })

  test("fetch failure on one URL: that comparison gets 'missing'; batch continues", async () => {
    const config: Config = {
      comparisons: [
        {
          entity: "broken",
          metric: "y",
          llamaUrl: "https://llama.test/broken",
          llamaPath: "value",
          externalProvider: "external",
          externalUrl: "https://external.test/broken",
          externalPath: "value",
        },
        {
          entity: "ok",
          metric: "y",
          llamaUrl: "https://llama.test/ok",
          llamaPath: "value",
          externalProvider: "external",
          externalUrl: "https://external.test/ok",
          externalPath: "value",
        },
      ],
    }

    mockFetch.mockImplementation((url: string) => {
      // 404 is non-transient — fetchJsonWithRetry bails immediately, no slow retries.
      if (url === "https://llama.test/broken") return errResponse(404)
      if (url === "https://external.test/broken") return errResponse(404)
      if (url === "https://llama.test/ok") return okResponse({ value: 100 })
      if (url === "https://external.test/ok") return okResponse({ value: 100 })
      throw new Error(`unexpected url ${url}`)
    })

    const errored: string[] = []
    const results = await runComparisons(config, {
      onFetchError: (url) => errored.push(url),
    })

    expect(results).toHaveLength(2)
    expect(results[0].status).toBe("missing")
    expect(results[1].status).toBe("ok")
    expect(errored).toEqual(
      expect.arrayContaining([
        "https://llama.test/broken",
        "https://external.test/broken",
      ]),
    )
  })
})
