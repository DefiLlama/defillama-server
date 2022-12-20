import aws from 'aws-sdk'
import sdk from '@defillama/sdk'
import fetch from "node-fetch";


const Bucket = "tvl-adapter-cache";

function getKey(project: string, chain: string): string {
  return `cache/${project}/${chain}.json`
}

function getLink(project: string, chain: string): string {
  return `https://${Bucket}.s3.eu-central-1.amazonaws.com/${getKey(project, chain)}`
}

export async function getCache(project: string, chain: string, { } = {}) {
  const Key = getKey(project, chain)

  try {
    const json = await (fetch(getLink(project, chain)).then(r => r.json()))
    return json
  } catch (e) {
    sdk.log('failed to fetch data from s3 bucket:', Key)
    // sdk.log(e)
    return {}
  }
}

export async function setCache(project: string, chain: string, cache: any, {
  ContentType = 'application/json',
  ACL = 'public-read'
} = {}) {

  const Key = getKey(project, chain)

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
