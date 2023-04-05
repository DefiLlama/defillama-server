import * as aws from 'aws-sdk'
import * as sdk from '@defillama/sdk'
import fetch from "node-fetch"

const Bucket = "tvl-adapter-cache";

function getKey(govType: string, project: string): string {
  return `governance-cache/${govType}/${project}.json`
}

function getLink(govType: string, project: string): string {
  return `https://${Bucket}.s3.eu-central-1.amazonaws.com/${getKey(govType, project)}`
}

export async function getCache(govType: string, project: string, { } = {}) {
  const Key = getKey(govType, project)

  try {
    const json = await (fetch(getLink(govType, project)).then(r => r.json()))
    return json
  } catch (e) {
    sdk.log('failed to fetch data from s3 bucket:', Key)
    // sdk.log(e)
    return {}
  }
}

export async function setCache(govType: string, project: string, cache: any, {
  ContentType = 'application/json',
  ACL = 'public-read'
} = {}) {

  const Key = getKey(govType, project)

  try {
    await new aws.S3()
      .upload({
        Bucket, Key,
        Body: JSON.stringify(cache),
        ACL, ContentType,
      }).promise();

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
  console.log('updating project: ', project)
  return setCache('compound', project, cache)
}

export async function getCompoundOverview() {
  return getCache('overview', 'compound')
}

export async function setCompoundOverview(cache: any) {
  console.log('overview')
  return setCache('overview', 'compound', cache)
}