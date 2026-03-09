import { mergeSortAndRemoveDups } from "."
import { Protocol } from "../../protocols/types"
import { dailyTokensTvl, dailyTvl, dailyUsdTokensTvl } from "../../utils/getLastRecord"
import { getAllProtocolItems } from "../db"
import { getDailyTvlCacheId, readFromPGCache, readRouteData, writeToPGCache } from "../cache/file-cache"
import { log, cache } from "@defillama/sdk"
import { createHash } from "crypto"
import fetch from "node-fetch";

const fetchJson = async (url: string, options?: { headers?: Record<string, string> }) => {
  const response = await fetch(url, { headers: options?.headers });
  return response.json();
};


export async function getProtocolAllTvlData(protocol: Protocol, useOnlyCachedData = true) {
  useOnlyCachedData = useOnlyCachedData === true
  const logEnabled = useOnlyCachedData

  let cacheKey = getDailyTvlCacheId(protocol.id)
  let { data: protocolCache, timestamp } = (await readFromPGCache(cacheKey, { withTimestamp: true })) ?? { data: null, timestamp: null }

  useOnlyCachedData = useOnlyCachedData && !!protocolCache
  let tvlQueryOptions = {}
  let tokensInUsdQueryOptions = {}
  let tokensQueryOptions = {}

  if (protocolCache) {
    // if cache is not empty, set query options to get only new records
    protocolCache.tvl = protocolCache.tvl ?? []
    protocolCache.tokensInUsd = protocolCache.tokensInUsd ?? []
    protocolCache.tokens = protocolCache.tokens ?? []
    if (protocolCache.tvl.length)
      tvlQueryOptions = { timestampAfter: protocolCache.tvl[protocolCache.tvl.length - 1].SK }
    if (protocolCache.tokensInUsd.length)
      tokensInUsdQueryOptions = { timestampAfter: protocolCache.tokensInUsd[protocolCache.tokensInUsd.length - 1].SK }
    if (protocolCache.tokens.length)
      tokensQueryOptions = { timestampAfter: protocolCache.tokens[protocolCache.tokens.length - 1].SK }
  }

  const unixNow = Math.floor(Date.now() / 1000)
  const currentHour = new Date().getHours();
  const cacheAgeLimit = currentHour <= 2 ? 2 * 60 * 60 : 4 * 60 * 60; // 2 hours or 10 hours in seconds
  const cacheIsOld = !timestamp || (unixNow - timestamp) > cacheAgeLimit;
  const deadProtocolWithCache = protocol.deadFrom && protocolCache
  const fetchNewData = cacheIsOld && !deadProtocolWithCache

  if (fetchNewData && !useOnlyCachedData) {
    if (logEnabled) log('Fetching new data for', protocol.name, cacheIsOld, (unixNow - timestamp) > cacheAgeLimit, unixNow, timestamp, cacheAgeLimit, unixNow - timestamp)
    let [historicalUsdTvl, historicalUsdTokenTvl, historicalTokenTvl,]: any = await Promise.all([
      getAllProtocolItems(dailyTvl, protocol.id, tvlQueryOptions),
      getAllProtocolItems(dailyUsdTokensTvl, protocol.id, tokensInUsdQueryOptions),
      getAllProtocolItems(dailyTokensTvl, protocol.id, tokensQueryOptions),
    ]);

    const updateCache = historicalTokenTvl.length > 0 || historicalUsdTokenTvl.length > 0 || historicalUsdTvl.length > 0
    if (!protocolCache) protocolCache = {}

    if (updateCache) {
      protocolCache.tvl = mergeSortAndRemoveDups(protocolCache.tvl, historicalUsdTvl)
      protocolCache.tokensInUsd = mergeSortAndRemoveDups(protocolCache.tokensInUsd, historicalUsdTokenTvl)
      protocolCache.tokens = mergeSortAndRemoveDups(protocolCache.tokens, historicalTokenTvl)
    }
    await writeToPGCache(cacheKey, protocolCache)
  }

  return [
    protocolCache.tvl,
    protocolCache.tokensInUsd,
    protocolCache.tokens,
  ]
}

export async function cachedJSONPull(options: {
  endpoint: string
  defaultResponse?: any
  headers?: Record<string, string>
}|string) {

  let endpoint: string
  let defaultResponse: any = {}
  let headers: Record<string, string> | undefined = undefined

  if (typeof options === "string") {
    endpoint = options
  } else {
    endpoint = options.endpoint
    defaultResponse = options.defaultResponse ?? {}
    headers = options.headers
  }

  // Create a cache key based on the endpoint
  const hash = createHash('sha256').update(endpoint).digest('hex').substring(0, 16)
  const cacheKey = `json-pull-${hash}`

  let data: any = null
  try {
    // Try to get data from cache
    data = await fetchJson(endpoint, { headers })
    cache.writeCache(cacheKey, data)
    return data;
  } catch (error: any) {
    log(`Error in cachedJSONPull for ${endpoint}:`, error?.message ?? error)
    const cachedData = await cache.readCache(cacheKey)
    if (cachedData) {
      log(`Returning cached data for ${endpoint}`);
      return cachedData;
    }
    return defaultResponse;
  }
}

export async function readCachedRouteData({ route, defaultResponse = { protocols: {} } }: {
  route: string, defaultResponse?: any
}) {
  // Create a cache key based on the route
  const hash = createHash('sha256').update(route).digest('hex').substring(0, 16)
  const cacheKey = `json-route-${hash}`

  let data: any = null
  try {
    // Try to get data from cache
    data = await readRouteData(route)
    cache.writeCache(cacheKey, data)
    return data;
  } catch (error: any) {
    log(`Error in readCachedRouteData for ${route}:`, error?.message ?? error)
    const cachedData = await cache.readCache(cacheKey)
    if (cachedData) {
      log(`Returning cached data for ${route}`);
      return cachedData;
    }
    return defaultResponse;
  }

}