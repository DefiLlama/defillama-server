import fetch from "node-fetch"
import retry from "async-retry"

/**
 * Configuration for {@link fetchJsonWithRetry}.
 */
export interface FetchOptions {
  /** Maximum number of retries on transient errors. Default: 3. */
  retries?: number
  /** Base backoff delay in milliseconds (exponential, with jitter). Default: 500. */
  backoffMs?: number
  /** Per-attempt timeout in milliseconds (via AbortController). Default: 10000. */
  timeoutMs?: number
}

/** HTTP status codes considered transient and worth retrying. */
const TRANSIENT_STATUS = new Set<number>([429, 500, 502, 503, 504])

/**
 * Fetches JSON from a URL with retry on transient HTTP errors.
 *
 * Retries on network errors and on transient HTTP statuses (429, 500, 502,
 * 503, 504). Non-transient errors (4xx other than 429) bail immediately.
 * Per-attempt timeout is enforced via AbortController.
 *
 * @param url - URL to fetch.
 * @param opts - Retry / timeout configuration.
 * @returns Parsed JSON body.
 * @throws Error on persistent failure or non-transient HTTP status.
 */
export async function fetchJsonWithRetry(
  url: string,
  opts: FetchOptions = {},
): Promise<unknown> {
  const { retries = 3, backoffMs = 500, timeoutMs = 10_000 } = opts

  return retry(
    async (bail) => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const response = await fetch(url, {
          signal: controller.signal as unknown as undefined,
        })
        if (!response.ok) {
          if (TRANSIENT_STATUS.has(response.status)) {
            throw new Error(
              `Transient ${response.status} ${response.statusText} on ${url}`,
            )
          }
          bail(
            new Error(
              `Non-transient ${response.status} ${response.statusText} on ${url}`,
            ),
          )
          return
        }
        return await response.json()
      } finally {
        clearTimeout(timeout)
      }
    },
    { retries, minTimeout: backoffMs, factor: 2, randomize: true },
  )
}

/**
 * Per-run cache for fetched JSON payloads.
 *
 * Caches **promises**, not values, so concurrent calls for the same URL
 * dedup correctly (only one underlying fetch is issued). Intended for use
 * within a single CLI run; instantiate fresh each run.
 */
export class UrlPayloadCache {
  private cache = new Map<string, Promise<unknown>>()

  /**
   * Returns the cached promise for `url`, or starts a fetch if not yet seen.
   *
   * @param url - URL to fetch.
   * @param opts - Forwarded to {@link fetchJsonWithRetry} on cache miss.
   */
  get(url: string, opts?: FetchOptions): Promise<unknown> {
    let payload = this.cache.get(url)
    if (!payload) {
      payload = fetchJsonWithRetry(url, opts).catch((error) => {
        this.cache.delete(url)
        throw error
      })
      this.cache.set(url, payload)
    }
    return payload
  }

  /** Empties the cache; subsequent {@link get} calls will re-fetch. */
  clear(): void {
    this.cache.clear()
  }
}
