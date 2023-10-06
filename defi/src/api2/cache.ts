import fs from 'fs'
import { promisify } from 'util';
import { exec } from 'child_process';
import fetch from "node-fetch";

import { METADATA_FILE } from './constants';
import { protocolMcap } from '../utils/craftProtocol';
import { IRaise } from '../types';
const execAsync = promisify(exec);

export const cache: {
  metadata: {
    protocols: any[],
    entities: any[],
    treasuries: any[],
  },
  mcaps: Record<string, Promise<number | null>>,
  raises: any,
} = {
  metadata: {
    protocols: [],
    entities: [],
    treasuries: [],
  },
  mcaps: {},
  raises: {},
}

export async function initCache() {
  await updateMetadata()
  await updateRaises()
}

async function updateMetadata() {
  const updateScript = __dirname + '/scripts/updateMetadata.ts';
  await execAsync(`git pull`)
  await execAsync(`ts-node ${updateScript}`)
  const dataString = fs.readFileSync(METADATA_FILE, 'utf8')
  const data = JSON.parse(dataString)
  cache.metadata = data
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