import * as sdk from '@defillama/sdk'
import fetch from "node-fetch"
import { storeR2JSONString, getR2JSONString } from '../utils/r2';

function getKey(govType: string, project: string): string {
  return `governance-cache/${govType}/${project.toLowerCase()}.json`.replace(/(:|'’)/g, '/')
}

function getLink(govType: string, project: string): string {
  return `https://defillama-datasets.llama.fi/${getKey(govType, project)}`
}

export async function getCache(govType: string, project: string, { } = {}) {
  const Key = getKey(govType, project)

  // sdk.log('[FETCHING] ', Key, getLink(govType, project))
  try {
    const json = await getR2JSONString(getKey(govType, project))
    return json
  } catch (e) {
    sdk.log('failed to fetch data from s3 bucket:', Key)
    // sdk.log(e)
    return {}
  }
}

export async function setCache(govType: string, project: string, cache: any) {
  const Key = getKey(govType, project)

  try {
    await storeR2JSONString(Key, JSON.stringify(cache))
    // sdk.log('[SAVED] ', Key)
  } catch (e) {
    sdk.log('failed to write data to s3 bucket: ', Key)
    // sdk.log(e)
  }
}

export async function getSnapshot(project: string) {
  return getCache('snapshot', project)
}

export async function setSnapshot(project: string, cache: any) {
  return setCache('snapshot', project, cache)
}


export async function getSnapshotOverview() {
  return getCache('overview', 'snapshot')
}

export async function setSnapshotOverview(cache: any) {
  return setCache('overview', 'snapshot', cache)
}

export async function getCompound(project: string) {
  return getCache('compound', project)
}

export async function setCompound(project: string, cache: any) {
  return setCache('compound', project, cache)
}

export async function getCompoundOverview() {
  return getCache('overview', 'compound')
}

export async function setCompoundOverview(cache: any) {
  return setCache('overview', 'compound', cache)
}

export async function getTally(project: string) {
  return getCache('tally', project)
}

export async function setTally(project: string, cache: any) {
  return setCache('tally', project, cache)
}


export async function getTallyOverview() {
  return getCache('overview', 'tally')
}

export async function setTallyOverview(cache: any) {
  return setCache('overview', 'tally', cache)
}
