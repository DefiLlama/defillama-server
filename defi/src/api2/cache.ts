import fs from 'fs'
import { promisify } from 'util';
import { exec } from 'child_process';
import fetch from "node-fetch";

import { METADATA_FILE } from './constants';
import { protocolMcap } from '../utils/craftProtocol';
import { IRaise } from '../types';
import sluggify from '../utils/sluggify';
const execAsync = promisify(exec);

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
}

export async function initCache() {
  await updateMetadata()
  await updateRaises()
  console.log('Cache initialized')
}

async function updateMetadata() {
  await execAsync(`npm run update-metadata-file`)
  const dataString = fs.readFileSync(METADATA_FILE, 'utf8')
  const data = JSON.parse(dataString)
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
    cache.entitiesSlugMap['entity-'+sluggify(p)] = p
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

setInterval(updateRaises, 1000 * 60 * 60 * 24)
setInterval(updateMetadata, 1000 * 60 * 30)
setInterval(clearMCap, 1000 * 60 * 60 * 3)