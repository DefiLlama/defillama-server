import * as sdk from '@defillama/sdk'
import fetch from "node-fetch";

const Bucket = "tvl-adapter-cache";

function getKey(project: string, chain: string): string {
  return `coins-cache/${project}/${chain}.json`
}

function getLink(project: string, chain: string): string {
  return `https://${Bucket}.s3.eu-central-1.amazonaws.com/${getKey(project, chain)}`
}

export async function getCache(project: string, chain: string) {
  const Key = getKey(project, chain)

  try {
    const json = await sdk.cache.readCache(Key)
    if (!json || Object.keys(json).length === 0) throw new Error('Invalid data')
    return json
  } catch (e) {
    try {
      const json = await (fetch(getLink(project, chain)).then(r => r.json()))
      await sdk.cache.writeCache(Key, json)
      return json
    } catch (e) {
      sdk.log('failed to fetch data from s3 bucket:', Key)
      // sdk.log(e)
      return {}
    }
  }
}

export async function setCache(project: string, chain: string, cache: any) {
  try {
    await sdk.cache.writeCache(getKey(project, chain), cache)
  } catch (e) {
    sdk.log('failed to write data to cache: ', getKey(project, chain))
    // sdk.log(e)
  }
}

export async function getConfig(project: string, endpoint: string) {
  if (!project || !endpoint) throw new Error('Missing parameters')
  const chain = 'config-cache'
  try {
    const json = await (fetch(endpoint).then(r => r.json()))
    await setCache(project, chain, json)
    return json
  } catch (e) {
    // sdk.log(e)
    sdk.log(project, 'trying to fetch from cache, failed to fetch data from endpoint:', endpoint)
    return getCache(project, chain)
  }
}
