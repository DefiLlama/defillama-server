import fetch from "node-fetch";

import { PROTOCOL_METADATA_ALL_KEY } from './constants';
import { protocolMcap } from '../utils/craftProtocol';
import { IRaise } from '../types';
import sluggify from '../utils/sluggify';
import { readFromPGCache } from './db';

export const cache: {
  metadata: {
    protocols: any[],
    entities: any[],
    treasuries: any[],
    parentProtocols: any[],
  },
  mcaps: Record<string, Promise<number | null>>,
  raises: any,
  protocolSlugMap: any,
  treasurySlugMap: any,
  entitiesSlugMap: any,
  parentProtocolSlugMap: any,
  childProtocols: any,
  protocolRes: any,
  parentProtocolRes: any,
} = {
  metadata: {
    protocols: [],
    entities: [],
    treasuries: [],
    parentProtocols: [],
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
}

export async function initCache() {
  await Promise.all([
    updateMetadata(),
    updateRaises(),
  ])
  console.log('Cache initialized')
}

async function updateMetadata() {
  const data = await readFromPGCache(PROTOCOL_METADATA_ALL_KEY)
  cache.metadata = data
  cache.protocolSlugMap = {}
  cache.treasurySlugMap = {}
  cache.entitiesSlugMap = {}
  cache.parentProtocolSlugMap = {}
  data.protocols.forEach((p: any) => {
    cache.protocolSlugMap[sluggify(p)] = p
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

function clearMCap() {
  cache.mcaps = {}
}

export async function getCachedMCap(geckoId: string | null) {
  if (!geckoId) return null
  if (!cache.mcaps.hasOwnProperty(geckoId)) {
    cache.mcaps[geckoId] = protocolMcap(geckoId)
  }
  return cache.mcaps[geckoId]
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
setInterval(clearMCap, MINUTE * 30)
setInterval(clearProtocolCache, MINUTE * 5)