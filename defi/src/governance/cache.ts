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

async function getCache(govType: string, project: string, { } = {}) {
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

async function setCache(govType: string, project: string, cache: any, {
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