import fetch from "node-fetch"
import { fetchJsonWithRetry, UrlPayloadCache } from "./fetchWithRetry"

jest.mock("node-fetch", () => jest.fn())
const mockFetch = fetch as unknown as jest.Mock

const okResponse = (body: any) => ({
  ok: true,
  status: 200,
  statusText: "OK",
  json: async () => body,
})

const errResponse = (status: number, statusText = "err") => ({
  ok: false,
  status,
  statusText,
  json: async () => ({}),
  text: async () => statusText,
})

describe("fetchJsonWithRetry", () => {
  beforeEach(() => mockFetch.mockReset())

  test("returns parsed JSON on 200", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ hello: "world" }))
    const result = await fetchJsonWithRetry("https://example.com/data.json")
    expect(result).toEqual({ hello: "world" })
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  test("retries on transient 503 then succeeds", async () => {
    mockFetch
      .mockResolvedValueOnce(errResponse(503))
      .mockResolvedValueOnce(okResponse({ ok: 1 }))
    const result = await fetchJsonWithRetry("https://example.com/data.json", {
      retries: 2,
      backoffMs: 1,
    })
    expect(result).toEqual({ ok: 1 })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  test("retries on 429 then succeeds", async () => {
    mockFetch
      .mockResolvedValueOnce(errResponse(429, "Too Many Requests"))
      .mockResolvedValueOnce(okResponse({ ok: 1 }))
    const result = await fetchJsonWithRetry("https://example.com/data.json", {
      retries: 2,
      backoffMs: 1,
    })
    expect(result).toEqual({ ok: 1 })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  test("gives up after max retries on persistent 500", async () => {
    mockFetch.mockResolvedValue(errResponse(500))
    await expect(
      fetchJsonWithRetry("https://example.com/data.json", {
        retries: 2,
        backoffMs: 1,
      }),
    ).rejects.toThrow(/500/)
    // initial + 2 retries = 3 attempts
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  test("does not retry on non-transient 404", async () => {
    mockFetch.mockResolvedValue(errResponse(404, "Not Found"))
    await expect(
      fetchJsonWithRetry("https://example.com/data.json", {
        retries: 2,
        backoffMs: 1,
      }),
    ).rejects.toThrow(/404/)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  test("does not retry on non-transient 401", async () => {
    mockFetch.mockResolvedValue(errResponse(401, "Unauthorized"))
    await expect(
      fetchJsonWithRetry("https://example.com/data.json", {
        retries: 2,
        backoffMs: 1,
      }),
    ).rejects.toThrow(/401/)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})

describe("UrlPayloadCache", () => {
  beforeEach(() => mockFetch.mockReset())

  test("dedups concurrent requests for the same URL", async () => {
    mockFetch.mockResolvedValue(okResponse({ x: 1 }))
    const cache = new UrlPayloadCache()
    const [a, b] = await Promise.all([
      cache.get("https://example.com/x"),
      cache.get("https://example.com/x"),
    ])
    expect(a).toEqual({ x: 1 })
    expect(b).toEqual({ x: 1 })
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  test("dedups sequential requests for the same URL", async () => {
    mockFetch.mockResolvedValue(okResponse({ x: 2 }))
    const cache = new UrlPayloadCache()
    await cache.get("https://example.com/x")
    await cache.get("https://example.com/x")
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  test("different URLs are fetched independently", async () => {
    mockFetch
      .mockResolvedValueOnce(okResponse({ a: 1 }))
      .mockResolvedValueOnce(okResponse({ b: 2 }))
    const cache = new UrlPayloadCache()
    const a = await cache.get("https://example.com/a")
    const b = await cache.get("https://example.com/b")
    expect(a).toEqual({ a: 1 })
    expect(b).toEqual({ b: 2 })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  test("clear() lets next get re-fetch", async () => {
    mockFetch.mockResolvedValue(okResponse({ x: 1 }))
    const cache = new UrlPayloadCache()
    await cache.get("https://example.com/x")
    cache.clear()
    await cache.get("https://example.com/x")
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})
