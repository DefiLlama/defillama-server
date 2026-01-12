import * as fs from "fs/promises"
import * as path from "path"
import { AdapterType } from "../data/types"

export const isLocalStoreEnabled = () => process.env.DIM_LOCAL_STORE === 'true'
export const getLocalStoreDir = () => process.env.DIM_LOCAL_STORE_DIR || "./dim-local-store"

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

export async function writeJsonAtomic(filePath: string, data: any) {
  const dir = path.dirname(filePath)
  await ensureDir(dir)
  const tmpPath = `${filePath}.tmp`
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2))
  await fs.rename(tmpPath, filePath)
}

export async function readJsonIfExists(filePath: string) {
  try {
    const raw = await fs.readFile(filePath, "utf-8")
    return JSON.parse(raw)
  } catch (e: any) {
    if (e?.code === 'ENOENT') return undefined
    throw e
  }
}

export async function listJsonFilesRecursively(root: string): Promise<string[]> {
  const out: string[] = []
  let entries: any[] = []
  try {
    entries = await fs.readdir(root, { withFileTypes: true })
  } catch (e: any) {
    if (e?.code === 'ENOENT') return out
    throw e
  }

  for (const ent of entries) {
    const p = path.join(root, ent.name)
    if (ent.isDirectory()) {
      out.push(...await listJsonFilesRecursively(p))
    } else if (ent.isFile() && ent.name.endsWith(".json")) {
      out.push(p)
    }
  }
  return out
}

export function getDailyLocalPath(adapterType: AdapterType, id: string, timeS: string) {
  return path.join(getLocalStoreDir(), "daily", String(adapterType), String(id), `${timeS}.json`)
}

export function getHourlyLocalPath(adapterType: AdapterType, id: string, timeS: string) {
  return path.join(getLocalStoreDir(), "hourly", String(adapterType), String(id), `${timeS}.json`)
}
