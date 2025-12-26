import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import * as sdk from '@defillama/sdk'

const { execSync } = require('child_process');

export interface IAdapterInfo {
  id: string
  chain: string
  timestamp: number
  version?: string
}

export async function handleAdapterError(e: Error, adapterInfo?: IAdapterInfo) {
  // TODO: handle error properly
  console.error(adapterInfo)
  console.error(e)
  throw new Error(`Couldn´t get volume for ${JSON.stringify(adapterInfo)}`)
}

/**
 * Creates a combined hash string from the contents of given files
 * Ignores files that can't be read
 * @param filePaths Array of file paths to read
 * @returns Combined hash string of the file contents
 */
export function createCombinedHash(filePaths: string[], basePath?: string): string {
  if (basePath) filePaths = filePaths.map(fp => path.join(basePath!, fp));
  const fileContents: string[] = [];

  for (const filePath of filePaths) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      fileContents.push(content);
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      // Ignore errors and continue
    }
  }

  const combinedContent = fileContents.join('');
  const hash = crypto.createHash('sha256').update(combinedContent).digest('hex');

  return hash;
}

function getHashFilePath(fileKey: string): string {
  return __dirname + `/../utils/imports/${fileKey}._lhash`;
}

/**
 * Writes a hash string to a file with ".hash" appended to the file key
 * @param fileKey Base file path
 * @param hash Hash string to write
 */
export function writeHashToFile(fileKey: string, hash: string): void {
  const hashFilePath = getHashFilePath(fileKey);
  fs.writeFileSync(hashFilePath, hash, 'utf-8');
}

/**
 * Reads a hash from a file if it exists
 * @param fileKey Base file path
 * @returns The hash string if found, undefined otherwise
 */
export function readHashFromFile(fileKey: string): string | undefined {
  const hashFilePath = getHashFilePath(fileKey);

  try {
    const hash = fs.readFileSync(hashFilePath, 'utf-8');
    return hash;
  } catch (error) {
    return undefined;
  }
}

/**
 * Gets the current Git commit hash of the repository
 * @param repoPath Optional path to the repository directory
 * @returns The current commit hash as a string
 */
export function getCurrentCommitHash(repoPath: string): string {
  try {
    const command = `cd ${repoPath} && git rev-parse --short HEAD`;
    const hash = execSync(command).toString().trim();
    return hash;
  } catch (error: any) {
    console.error('Error getting current commit hash:',   error?.message || error);
    return 'unknown'+Math.random().toString(36).substring(2, 8); // return a random string to avoid caching
  }
}

/**
 * Checks if a file exists
 * @param filePath Path to the file to check
 * @returns True if the file exists, false otherwise
 */
export function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch (error: any) {
    console.error(`Error checking if file exists ${filePath}:`, error?.message || error);
    return false;
  }
}



export const isBuildServerMode = !!process.env.LLAMA_IS_BUILD_SERVER_MODE

export async function writeFromCache(hashkey: string, outFile: string, { successMessage = 'cache exists, copying from cache', errorMessage = 'error reading from cache' }: {
  successMessage?: string
  errorMessage?: string
} = {}) {
  if (!isBuildServerMode) return false

  try {
    const data = await sdk.cache.readExpiringJsonCache(hashkey)
    if (data) {
      console.log(successMessage)
      fs.writeFileSync(outFile, JSON.stringify(data))
      return true
    }
  } catch (e) {
    console.log(errorMessage)
  }
  return false
}

export async function writeToCache(hashkey: string, data: any, { successMessage = 'cache written', errorMessage = 'error writing to cache', expireAfter = 60 * 60 * 24 }: {
  successMessage?: string
  errorMessage?: string
  expireAfter?: number
} = {}) {

  // enable only in build server mode
  if (!isBuildServerMode) return;


  try {
    await sdk.cache.writeExpiringJsonCache(hashkey, data, { expireAfter })
    console.log(successMessage)
  } catch (e) {
    console.log(errorMessage, e)
  }
}
