import fs from 'fs';
import path from 'path';
import { METADATA_FILE, PG_CACHE_KEYS } from '../constants';
import getEnv from '../env';
import { log, } from '@defillama/sdk'
import { sliceIntoChunks } from '@defillama/sdk/build/util';
export { PG_CACHE_KEYS }

const CACHE_DIR = getEnv().api2CacheDir;
export const ROUTES_DATA_DIR = path.join(CACHE_DIR!, 'build')

const pathExistsMap: any = {}

export function getAllFileSubpathsSync(folder: string, isAbsolutePath = false): Set<string> {
  try {

    const subpaths: Set<string> = new Set();
    if (!isAbsolutePath)
      folder = path.join(ROUTES_DATA_DIR!, folder)

    const files = fs.readdirSync(folder, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(folder, file.name);
      if (file.isDirectory()) {
        const subfolderSubpaths = getAllFileSubpathsSync(filePath, true);
        for (const subpath of subfolderSubpaths) {
          subpaths.add(path.join(file.name, subpath));
        }
      } else {
        subpaths.add(file.name);
      }
    }
    return subpaths
  } catch (e) {
    console.error('Error reading folder:', folder, (e as any)?.message)
    return new Set()
  }
}

async function ensureDirExists(folder: string) {

  if (!pathExistsMap[folder]) pathExistsMap[folder] = createPathIfMissing()
  return pathExistsMap[folder]

  async function createPathIfMissing() {
    try {
      await fs.promises.access(folder);
    } catch {
      try {
        await fs.promises.mkdir(folder, { recursive: true });
      } catch (e) {
        console.error(e)
      }
    }
  }
}

export async function getMetadataAll() {
  const data = fs.readFileSync(METADATA_FILE, 'utf8')
  return JSON.parse(data)
}

export const fileNameNormalizer = (fileName: string) => decodeURIComponent(fileName).replace(/[^a-zA-Z0-9\/\.]/g, '').toLowerCase()

export async function storeRouteData(subPath: string, data: any) {
  subPath = fileNameNormalizer(`build/${subPath}`)
  return storeData(subPath, data)
}

export async function readRouteData(subPath: string) {
  subPath = fileNameNormalizer(`build/${subPath}`)
  return readFileData(subPath)
}

async function storeData(subPath: string, data: any) {
  const filePath = path.join(CACHE_DIR!, subPath)
  const dirPath = path.dirname(filePath)
  await ensureDirExists(dirPath)
  try {
    return await fs.promises.writeFile(filePath, JSON.stringify(data))
  } catch (e) {
    log(`Error storing data to ${filePath}:`, (e as any)?.message)
    return null
  }
}

async function readFileData(subPath: string) {
  const filePath = path.join(CACHE_DIR!, subPath)
  try {
    const data = await fs.promises.readFile(filePath, 'utf8')
    return JSON.parse(data.toString())
  } catch (e) {
    log((e as any)?.message)
    return null
  }
}

async function deleteFileData(subPath: string) {
  const filePath = path.join(CACHE_DIR!, subPath)
  return fs.promises.unlink(filePath)
}

function getCacheFile(key: string) {
  return `pg-cache/${key}`
}

export async function readFromPGCache(key: string, { withTimestamp = false } = {}) {
  const item: any = await readFileData(getCacheFile(key))
  if (!item) return null
  if (withTimestamp) return item
  return item.data
}

export async function writeToPGCache(key: string, data: any) {
  const id = getCacheFile(key)
  return storeData(id, { id, timestamp: Math.floor(Date.now() / 1e3), data })
}

// it is no longer needed thanks to change to deleteFromPGCache
// ANY CHANGE TO THIS VALUE NEEDS TO BE SYNCED WITH A CHANGE ON https://github.com/DefiLlama/born-to-llama/blob/master/src/commands/deleteCache.ts#L30 TOO
let TVL_CACHE_FOLDER = 'tvl-cache-daily-v0.9'  // update the version number to reset the cache
if (process.env.LLAMA_RUN_LOCAL === 'true') {
  TVL_CACHE_FOLDER = 'tvl-cache-daily'
}

export async function clearOldCacheFolders() {
  try {
    const parentPath = path.join(CACHE_DIR!, 'pg-cache')
    console.log('parentPath', parentPath)
    const folders = fs.readdirSync(parentPath!, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('tvl-cache-daily-'))
      .map(dirent => dirent.name);

    for (const folder of folders) {
      if (folder !== TVL_CACHE_FOLDER) {
        const folderPath = path.join(parentPath, folder);
        fs.rmSync(folderPath, { recursive: true, force: true });
        log(`Deleted old cache folder: ${folder}`);
      }
    }
  } catch (e) {
    console.error('Error clearing old cache folders:', e)
  }
}

export function getDailyTvlCacheId(id: string) {
  if (!id) throw new Error('Missing required parameter: id')
  return `${TVL_CACHE_FOLDER}/${id}`
}

export async function deleteFromPGCache(key: string) {
  log('Deleting from db cache:', key)
  let keySplit = key.split('/')
  if (typeof keySplit[1] === 'string' && keySplit[1].startsWith('tvl-cache-daily')) {
    keySplit[1] = TVL_CACHE_FOLDER
    key = keySplit.join('/');
    log("delete key changed to:", key)
  }
  const id = getCacheFile(key)
  return deleteFileData(id)
}


// allTvlData is quite big, so we need to chunk it
// into smaller pieces to avoid hitting the file size limit, json.stringify error
export async function storeTvlCacheAllFile(data: any) {
  if (typeof data !== 'object') {
    throw new Error('Invalid data type. Expected an object.')
  }
  const { allTvlData = {}, ...restCache } = data
  const  tvlEntries = Object.entries(allTvlData)
  const chunkedTvlEntries = sliceIntoChunks(tvlEntries, 1000)
  restCache.tvlEntryCount = chunkedTvlEntries.length

  await writeToPGCache(PG_CACHE_KEYS.CACHE_DATA_ALL, restCache)
  let i = 0 
  for (const chunk of chunkedTvlEntries) {
    const key = `${PG_CACHE_KEYS.CACHE_DATA_ALL}-tvlChunk-${i}`
    await writeToPGCache(key, chunk)
    i++
  }
}

export async function readTvlCacheAllFile() {
  const restCache = await readFromPGCache(PG_CACHE_KEYS.CACHE_DATA_ALL)
  if (!restCache) return {}
  const { tvlEntryCount } = restCache
  const allTvlData: any = {}
  for (let i = 0; i < tvlEntryCount; i++) {
    const key = `${PG_CACHE_KEYS.CACHE_DATA_ALL}-tvlChunk-${i}`
    const chunk = await readFromPGCache(key)
    if (chunk) {
      for (const [id, data] of chunk)
        allTvlData[id] = data
    }
  }

  return { ...restCache, allTvlData }
}