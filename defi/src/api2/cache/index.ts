import fetch from "node-fetch";

import { IRaise, IProtocol } from '../../types';
import sluggify from '../../utils/sluggify';
import { getLatestProtocolItems, } from '../db';
import { dailyTvl, dailyUsdTokensTvl, dailyTokensTvl, hourlyTvl, hourlyUsdTokensTvl, hourlyTokensTvl, } from "../../utils/getLastRecord";
import { log } from '@defillama/sdk'
import { ChainCoinGekcoIds } from "../../utils/normalizeChain";
import { getMetadataAll, readFromPGCache } from './file-cache'
import { PG_CACHE_KEYS } from "../constants";
import { Protocol } from "../../protocols/types";
import { shuffleArray } from "../../utils/shared/shuffleArray";
import PromisePool from "@supercharge/promise-pool";
import { getProtocolAllTvlData } from "../utils/cachedFunctions";
import { loadDimensionsCache } from "../utils/dimensionsUtils";

export const cache: {
  metadata: {
    protocols: any[],
    entities: any[],
    treasuries: any[],
    parentProtocols: any[],
    chainCoingeckoIds: ChainCoinGekcoIds,
    isDoubleCountedProtocol: { [protocolId: string]: boolean },
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
} = {
  metadata: {
    protocols: [],
    entities: [],
    treasuries: [],
    parentProtocols: [],
    isDoubleCountedProtocol: {},
    chainCoingeckoIds: {},
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
}

const MINUTES = 60 * 1000
const HOUR = 60 * MINUTES

export async function initCache({ cacheType = 'cron' } = { cacheType: 'none' }) {
  console.time('Cache initialized: ' + cacheType)
  await updateMetadata()
  if (cacheType === 'api-server') {
    const _cache = (await readFromPGCache(PG_CACHE_KEYS.CACHE_DATA_ALL)) ?? {}
    Object.entries(_cache).forEach(([k, v]: any) => (cache as any)[k] = v)

    await setHistoricalTvlForAllProtocols()
    await loadDimensionsCache()


    // dont run it for local dev env
    if (!process.env.API2_DEBUG_MODE) {
      setInterval(updateRaises, 20 * MINUTES)
      setInterval(updateMCaps, 20 * MINUTES)
      setInterval(tvlProtocolDataUpdate, 20 * MINUTES)
      setInterval(setHistoricalTvlForAllProtocols, 2 * HOUR)
    }


  } else if (cacheType === 'cron') {
    await Promise.all([
      updateRaises(),
      updateMCaps(),
      tvlProtocolDataUpdate(cacheType),
      updateAllTvlData(cacheType),
    ])
  }

  console.timeEnd('Cache initialized: ' + cacheType)
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
    cache.metadata.isDoubleCountedProtocol[p.id] = p.doublecounted === true
    delete p.doublecounted
    if (p.parentProtocol) {
      if (!cache.childProtocols[p.parentProtocol]) cache.childProtocols[p.parentProtocol] = []
      cache.childProtocols[p.parentProtocol].push(p)
    }
  })
  data.entities.forEach((p: any) => {
    cache.entitiesSlugMap[sluggify(p)] = p
  })
  data.treasuries.forEach((p: any) => {
    cache.treasurySlugMap[sluggify(p).replace("-(treasury)", '')] = p
  })
  data.parentProtocols.forEach((p: any) => {
    cache.parentProtocolSlugMap[sluggify(p)] = p
  })
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
  allProtocolItems.forEach((item: any) => cache.tvlProtocol[item.id] = item.data)
  allProtocolUSDItems.forEach((item: any) => cache.tvlUSDProtocol[item.id] = item.data)
  allProtocolTokenItems.forEach((item: any) => cache.tvlTokenProtocol[item.id] = item.data)
}

export function getLastHourlyRecord(protocol: IProtocol) {
  return cache.tvlProtocol[protocol.id]
}

export function getLastHourlyTokensUsd(protocol: IProtocol) {
  return cache.tvlUSDProtocol[protocol.id]
}

export function getLastHourlyTokens(protocol: IProtocol) {
  return cache.tvlTokenProtocol[protocol.id]
}

export function checkModuleDoubleCounted(protocol: IProtocol) {
  return cache.metadata.isDoubleCountedProtocol[protocol.id] === true
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
    cache.historicalTvlForAllProtocolsMeta = await readFromPGCache(PG_CACHE_KEYS.HISTORICAL_TVL_DATA_META)
  } catch (e) {
    console.error(e);
  }
}

setInterval(() => {
  Object.values(CACHE_KEYS).forEach((key) => {
    (cache as any)[key] = {}
  })
}, 1 * MINUTES)