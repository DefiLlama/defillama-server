import fetch from "node-fetch";

import { PG_CACHE_KEYS } from './constants';
import { IRaise, IProtocol } from '../types';
import sluggify from '../utils/sluggify';
import { readFromPGCache, getLatestProtocolItems, } from './db';
import { dailyTvl, dailyUsdTokensTvl, hourlyTvl, hourlyUsdTokensTvl } from "../utils/getLastRecord";
import { log } from '@defillama/sdk'
import { ChainCoinGekcoIds } from "../utils/normalizeChain";

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
}

export async function initCache({
  isApi2Server = false,
} = {}) {
  console.time('Cache initialized')
  await Promise.all([
    updateMetadata(isApi2Server),
    updateRaises(),
  ])
  await Promise.all([
    await updateMCaps(),
    await tvlProtocolDataUpdate(isApi2Server),
  ])

  console.timeEnd('Cache initialized')
}

async function updateMetadata(isFirstRun = false) {
  const data = await readFromPGCache(PG_CACHE_KEYS.PROTOCOL_METADATA_ALL)
  cache.metadata = data

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
  if (!isFirstRun)
    await tvlProtocolDataUpdate()
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

async function tvlProtocolDataUpdate(isFirstRun = false) {
  if (isFirstRun === true) {
    const allProtocolItems = await getLatestProtocolItems(dailyTvl)
    const allProtocolUSDItems = await getLatestProtocolItems(dailyUsdTokensTvl)
    allProtocolItems.forEach((item: any) => cache.tvlProtocol[item.id] = item.data)
    allProtocolUSDItems.forEach((item: any) => cache.tvlUSDProtocol[item.id] = item.data)
    log('tvlProtocolDataUpdate: initialized cache')
    log('tvlProtocol#', Object.keys(cache.tvlProtocol).length)
    log('tvlUSDProtocol#', Object.keys(cache.tvlUSDProtocol).length)
  }

  const allProtocolItems = await getLatestProtocolItems(hourlyTvl, { filterLast24Hours: true })
  const allProtocolUSDItems = await getLatestProtocolItems(hourlyUsdTokensTvl, { filterLast24Hours: true })
  allProtocolItems.forEach((item: any) => cache.tvlProtocol[item.id] = item.data)
  allProtocolUSDItems.forEach((item: any) => cache.tvlUSDProtocol[item.id] = item.data)
}

export function getCoinMarkets() {
  return cache.mcaps
}

export function getLastHourlyRecord(protocol: IProtocol) {
  return cache.tvlProtocol[protocol.id]
}

export function getLastHourlyTokensUsd(protocol: IProtocol) {
  return cache.tvlUSDProtocol[protocol.id]
}

export function checkModuleDoubleCounted(protocolId: string) {
  return cache.metadata.isDoubleCountedProtocol[protocolId] === true
}

export function protocolHasMisrepresentedTokens(protocol: IProtocol) {
  return protocol.misrepresentedTokens
}

export const CACHE_KEYS = {
  PROTOCOL: 'protocolRes',
  PARENT_PROTOCOL: 'parentProtocolRes',
}

function clearProtocolCache() {
  cache.protocolRes = {};
  cache.parentProtocolRes = {};
}

const MINUTE = 1000 * 60
const HOUR = MINUTE * 60

setInterval(updateRaises, HOUR * 24)
setInterval(updateMetadata, MINUTE * 15)
setInterval(updateMCaps, HOUR)
setInterval(clearProtocolCache, MINUTE * 5)
// setInterval(tvlProtocolDataUpdate, MINUTE * 15) // run as part of updateMetadata