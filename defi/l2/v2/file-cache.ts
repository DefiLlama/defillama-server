import fs from "fs";
import path from "path";

const CACHE_VERSION = "v1.0";
const CACHE_DIR = process.env.CHAIN_ASSETS_CACHE_DIR || path.join(__dirname, ".chain-assets-cache");
const VERSIONED_CACHE_DIR = path.join(CACHE_DIR, CACHE_VERSION);

const pathExistsMap: { [key: string]: Promise<void> } = {};

async function ensureDirExists(folder: string): Promise<void> {
  if (!pathExistsMap[folder]) {
    pathExistsMap[folder] = (async () => {
      try {
        await fs.promises.access(folder);
      } catch {
        try {
          await fs.promises.mkdir(folder, { recursive: true });
        } catch (e) {
          console.error("Error creating directory:", (e as any)?.message);
        }
      }
    })();
  }
  return pathExistsMap[folder];
}

async function storeData(subPath: string, data: any): Promise<void> {
  const filePath = path.join(VERSIONED_CACHE_DIR, subPath);
  await ensureDirExists(path.dirname(filePath));
  try {
    await fs.promises.writeFile(filePath, JSON.stringify(data));
  } catch (e) {
    console.error(`Error storing cache ${filePath}:`, (e as any)?.message);
  }
}

async function readData(subPath: string): Promise<any> {
  const filePath = path.join(VERSIONED_CACHE_DIR, subPath);
  try {
    const raw = await fs.promises.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function storeChainHistory(chain: string, data: any[]): Promise<void> {
  await storeData(`history/${chain}.json`, data);
}

export async function readChainHistory(chain: string): Promise<any[] | null> {
  return readData(`history/${chain}.json`);
}

export async function storeAllChainsHistory(data: any[]): Promise<void> {
  await storeData("history/all.json", data);
}

export async function readAllChainsHistory(): Promise<any[] | null> {
  return readData("history/all.json");
}
