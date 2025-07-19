import fetch from "node-fetch";

import { IRaise, IProtocol } from '../../types';
import sluggify, { sluggifyString } from '../../utils/sluggify';
import { getLatestProtocolItems, } from '../db';
import { dailyTvl, dailyUsdTokensTvl, dailyTokensTvl, hourlyTvl, hourlyUsdTokensTvl, hourlyTokensTvl, } from "../../utils/getLastRecord";
import { log } from '@defillama/sdk'
import { ChainCoinGekcoIds } from "../../utils/normalizeChain";
import { clearOldCacheFolders, getMetadataAll, readHistoricalTVLMetadataFile, readRouteData, readTvlCacheAllFile } from './file-cache'
import { Protocol } from "../../protocols/types";
import { shuffleArray } from "../../utils/shared/shuffleArray";
import PromisePool from "@supercharge/promise-pool";
import { getProtocolAllTvlData } from "../utils/cachedFunctions";
// import { getDimensionsCacheV2, } from "../utils/dimensionsUtils";
import { getTwitterOverviewFileV2 } from "../../../dev-metrics/utils/r2";
import { RUN_TYPE } from "../utils";
import { updateProtocolMetadataUsingCache } from "../../protocols/data";

export const cache: {
  metadata: {
    protocols: any[],
    entities: any[],
    treasuries: any[],
    parentProtocols: any[],
    chainCoingeckoIds: ChainCoinGekcoIds,
    isDoubleCountedProtocol: { [protocolId: string]: boolean },
    protocolAppMetadata: any,
  },
  mcaps: Record<string, { mcap: number, timestamp: number }>,
  raises: any,
  protocolSlugMap: any,
  treasurySlugMap: any,
  entitiesSlugMap: any,
  parentProtocolSlugMap: any,
  childProtocols: any,
  protocolRes: any,
  parentProtocolRes: any,
  tvlProtocol: any,
  tvlUSDProtocol: any,
  tvlTokenProtocol: any,
  allTvlData: any,
  historicalTvlForAllProtocolsMeta: any,
  feesAdapterCache: any,
  twitterOverview: any,
  otherProtocolsMap: any,
  latestHourlyData: {
    tvl: any,
    tvlUSD: any,
    tvlToken: any,
  },
} = {
  metadata: {
    protocols: [],
    entities: [],
    treasuries: [],
    parentProtocols: [],
    isDoubleCountedProtocol: {},
    chainCoingeckoIds: {},
    protocolAppMetadata: {},
  },
  mcaps: {},
  raises: {},
  protocolSlugMap: {},
  treasurySlugMap: {},
  entitiesSlugMap: {},
  parentProtocolSlugMap: {},
  childProtocols: {},
  protocolRes: {},
  parentProtocolRes: {},
  tvlProtocol: {},
  tvlUSDProtocol: {},
  tvlTokenProtocol: {},
  allTvlData: {},
  historicalTvlForAllProtocolsMeta: {},
  feesAdapterCache: {},
  twitterOverview: {},
  otherProtocolsMap: {},
  latestHourlyData: {
    tvl: {},
    tvlUSD: {},
    tvlToken: {},
  },
}

const MINUTES = 60 * 1000
const HOUR = 60 * MINUTES

export async function initCache({ cacheType = RUN_TYPE.API_SERVER }: { cacheType?: string } = { cacheType: RUN_TYPE.API_SERVER }) {
  console.time('Cache initialized: ' + cacheType)
  await updateMetadata()
  if (cacheType === RUN_TYPE.API_SERVER) {
    const _cache = await readTvlCacheAllFile()
    Object.entries(_cache).forEach(([k, v]: any) => (cache as any)[k] = v)

    // await getDimensionsCacheV2(cacheType) // initialize dimensions cache // no longer needed since we pre-generate the files

    await setHistoricalTvlForAllProtocols()
    // await loadDimensionsCache()


    // dont run it for local dev env
    if (!process.env.API2_DEBUG_MODE) {
      setInterval(updateRaises, 20 * MINUTES)
      setInterval(updateMCaps, 20 * MINUTES)
      setInterval(tvlProtocolDataUpdate, 20 * MINUTES)
      setInterval(setHistoricalTvlForAllProtocols, 2 * HOUR)
    }

    cache.metadata.protocolAppMetadata = await readRouteData('/config/smol/appMetadata-protocols.json') ?? {}
    updateProtocolMetadataUsingCache(cache.metadata.protocolAppMetadata)


  } else if (cacheType === RUN_TYPE.CRON) {
    await Promise.all([
      updateRaises(),
      updateMCaps(),
      tvlProtocolDataUpdate(cacheType),
      updateAllTvlData(cacheType),
    ])
    addChildProtocolNames()
  }


  cache.twitterOverview = await getTwitterOverviewFileV2()

  console.timeEnd('Cache initialized: ' + cacheType)
}

function addChildProtocolNames() {
  cache.otherProtocolsMap = {}
  Object.keys(cache.childProtocols).forEach((parentProtocolId) => {
    const isDead = (p: any) => p.deadFrom || p.deprecated
    const deadProtocols = cache.childProtocols[parentProtocolId].filter(isDead)
    const liveProtocols = cache.childProtocols[parentProtocolId].filter((p: any) => !isDead(p))
    const sortProtocols = (a: any, b: any) => (cache.tvlProtocol[b.id]?.tvl ?? 0) - (cache.tvlProtocol[a.id]?.tvl ?? 0)
    liveProtocols.sort(sortProtocols)
    deadProtocols.sort(sortProtocols)
    cache.otherProtocolsMap[parentProtocolId] = [liveProtocols, deadProtocols].flat().map((p: any) => p.name)
  })
}

async function updateMetadata() {
  const data = await getMetadataAll()
  cache.metadata = data as any

  // reset cache
  cache.metadata.isDoubleCountedProtocol = {}
  cache.protocolSlugMap = {}
  cache.treasurySlugMap = {}
  cache.entitiesSlugMap = {}
  cache.childProtocols = {}
  cache.parentProtocolSlugMap = {}

  data.protocols.forEach((p: any) => {
    cache.protocolSlugMap[sluggify(p)] = p
    addMappingForPreviousNames(p, cache.protocolSlugMap)
    cache.metadata.isDoubleCountedProtocol[p.id] = p.doublecounted === true
    delete p.doublecounted
    if (p.parentProtocol) {
      if (!cache.childProtocols[p.parentProtocol]) cache.childProtocols[p.parentProtocol] = []
      cache.childProtocols[p.parentProtocol].push(p)
    }
  })
  data.entities.forEach((p: any) => {
    cache.entitiesSlugMap[sluggify(p)] = p
    addMappingForPreviousNames(p, cache.entitiesSlugMap)
  })
  data.treasuries.forEach((p: any) => {
    cache.treasurySlugMap[sluggify(p).replace("-(treasury)", '')] = p
    addMappingForPreviousNames(p, cache.treasurySlugMap, (name: string) => sluggifyString(name).replace("-(treasury)", ''))
  })
  data.parentProtocols.forEach((p: any) => {
    cache.parentProtocolSlugMap[sluggify(p)] = p
    addMappingForPreviousNames(p, cache.parentProtocolSlugMap)
  })

  function addMappingForPreviousNames(p: Protocol, _cache: any, _sluggify = sluggifyString) {
    if (Array.isArray(p?.previousNames)) {
      p.previousNames.forEach((name: string) => {
        _cache[_sluggify(name)] = p
      })
    }
  }
}

async function updateRaises() {
  const { raises } = await fetch("https://api.llama.fi/raises").then((res) => res.json())
  const raisesObject: any = {}
  raises.forEach((r: any) => {
    const id = r.defillamaId
    if (!id) return;
    if (!raisesObject[id]) raisesObject[id] = []
    raisesObject[id].push(r)
  })
  cache.raises = raisesObject
}

async function updateAllTvlData(cacheType?: string) {
  if (cacheType !== 'cron') return;

  // to ensure that we dont run out of disk space
  await clearOldCacheFolders()
  const { protocols, treasuries, entities } = cache.metadata
  let actions = [protocols, treasuries, entities].flat()
  shuffleArray(actions) // randomize order of execution
  log('[All tvl] Updating', actions.length, 'protocols')
  await PromisePool
    .withConcurrency(13)
    .for(actions)
    .process(async (protocol: Protocol) => {
      try {
        cache.allTvlData[protocol.id] = (await getProtocolAllTvlData(protocol, false))[0]
      } catch (e) {
        console.error(e);
      }
    });
}

export function getProtocols() {
  return cache.metadata.protocols
}

export function getEntities() {
  return cache.metadata.entities
}

export function getTreasuries() {
  return cache.metadata.treasuries
}

export function getRaises(protocolId: string): IRaise[] {
  return cache.raises[protocolId] ?? []
}

async function updateMCaps() {
  const geckoIdSet = new Set<string>()
  const addGeckoId = (p: any) => p.gecko_id && geckoIdSet.add(p.gecko_id)
  cache.metadata.protocols.forEach(addGeckoId)
  cache.metadata.parentProtocols.forEach(addGeckoId)
  const mcaps = await getProtocolMcaps([...geckoIdSet])
  // cache.mcaps = {}
  Object.entries(mcaps).forEach(([k, v]: any) => {
    cache.mcaps[k] = v
  })

  async function getProtocolMcaps(geckoIds: string[]) {
    const mcaps = await fetch("https://coins.llama.fi/mcaps", {
      method: "POST",
      body: JSON.stringify({
        coins: geckoIds.map((id) => `coingecko:${id}`),
      }),
    }).then((r) => r.json())
      .catch((err) => {
        console.log(err);
        return {};
      });

    return mcaps
  };
}

export async function getCachedMCap(geckoId: string | null) {
  if (!geckoId) return null
  return cache.mcaps['coingecko:' + geckoId]?.mcap ?? null
}

export function getCoinMarkets() {
  return cache.mcaps
}

export function getCacheByCacheKey(key: string, id: string) {
  return (cache as any)[key][id];
}

export function deleteCacheByCacheKey(key: string, id: string) {
  delete (cache as any)[key][id];
}

export function setCacheByCacheKey(key: string, id: string, data: any) {
  (cache as any)[key][id] = data
}

export async function cacheAndRespond({ key, id, origFunction, args }: { key: string, id: string, origFunction: any, args: any[] }) {
  let res = getCacheByCacheKey(key, id)
  if (res) return res
  res = origFunction(...args)
  setCacheByCacheKey(key, id, res)

  // remove from cache if response is error
  try {
    const _response = await res
    return _response
  } catch (e) {
    deleteCacheByCacheKey(key, id)
    throw e
  }
}

async function tvlProtocolDataUpdate(cacheType?: string) {
  let allProtocolItems, allProtocolUSDItems, allProtocolTokenItems
  const isFirstRun = cacheType === 'cron' || Object.keys(cache.tvlProtocol).length === 0

  if (isFirstRun) {
    allProtocolItems = await getLatestProtocolItems(dailyTvl)
    allProtocolUSDItems = await getLatestProtocolItems(dailyUsdTokensTvl)
    allProtocolTokenItems = await getLatestProtocolItems(dailyTokensTvl)
    allProtocolItems.forEach((item: any) => cache.tvlProtocol[item.id] = item.data)
    allProtocolUSDItems.forEach((item: any) => cache.tvlUSDProtocol[item.id] = item.data)
    allProtocolTokenItems.forEach((item: any) => cache.tvlTokenProtocol[item.id] = item.data)
  }


  allProtocolItems = await getLatestProtocolItems(hourlyTvl, { filterLast24Hours: true })
  allProtocolUSDItems = await getLatestProtocolItems(hourlyUsdTokensTvl, { filterLast24Hours: true })
  allProtocolTokenItems = await getLatestProtocolItems(hourlyTokensTvl, { filterLast24Hours: true })
  allProtocolItems.forEach((item: any) => {
    cache.tvlProtocol[item.id] = item.data
    cache.latestHourlyData.tvl[item.id] = item.data
  })
  allProtocolUSDItems.forEach((item: any) => {
    cache.tvlUSDProtocol[item.id] = item.data
    cache.latestHourlyData.tvlUSD[item.id] = item.data
  })
  allProtocolTokenItems.forEach((item: any) => {
    cache.tvlTokenProtocol[item.id] = item.data
    cache.latestHourlyData.tvlToken[item.id] = item.data
  })
}

export function getLastHourlyRecord(protocol: IProtocol) {
  return cache.tvlProtocol[protocol.id]  // TODO: should this be changed to latestHourlyData.tvl which returns latest hourly tvl record  (checking only the past 24 hours)
}

export function getLastHourlyTokensUsd(protocol: IProtocol) {
  return cache.tvlUSDProtocol[protocol.id]
}

export function getLastHourlyTokens(protocol: IProtocol) {
  return cache.tvlTokenProtocol[protocol.id]
}

export function protocolHasMisrepresentedTokens(protocol: IProtocol) {
  return protocol.misrepresentedTokens
}

export const CACHE_KEYS = {
  PROTOCOL: 'protocolRes',
  PARENT_PROTOCOL: 'parentProtocolRes',
}

async function setHistoricalTvlForAllProtocols() {
  try {
    cache.historicalTvlForAllProtocolsMeta = await readHistoricalTVLMetadataFile()
  } catch (e) {
    console.error(e);
  }
}

setInterval(() => {
  Object.values(CACHE_KEYS).forEach((key) => {
    (cache as any)[key] = {}
  })
}, 1 * MINUTES)