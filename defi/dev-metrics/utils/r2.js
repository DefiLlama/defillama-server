const sdk = require('@defillama/sdk')
const axios = require('axios')
const ENV = require('../env')
const { S3Client, PutObjectCommand, } = require("@aws-sdk/client-s3");

const datasetBucket = "defillama-datasets";
const publicBucketUrl = "https://defillama-datasets.llama.fi";

const R2_ENDPOINT = "https://" + ENV.R2_ENDPOINT;

const R2 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: ENV.R2_ACCESS_KEY_ID,
    secretAccessKey: ENV.R2_SECRET_ACCESS_KEY,
  },
});


async function storeR2JSONString(filename, body, cache) {
  const command = new PutObjectCommand({
    Bucket: datasetBucket,
    Key: filename,
    Body: body,
    ContentType: "application/json",
    ...(!!cache
      ? {
        CacheControl: `max-age=${cache}`,
      }
      : {}),
  });
  return await R2.send(command);
}

function getKey(govType, project) {
  return `dev-metrics/${govType}/${project.toLowerCase()}.json`.replace(/(:|'|#)/g, '/')
}

function getLink(govType, project) {
  return `${publicBucketUrl}/${getKey(govType, project)}`
}

async function getCache(govType, project, { } = {}) {
  const Key = getKey(govType, project)

  console.log('fetching data from s3 bucket:', getLink(govType, project))
  try {
    const { data: json } = await axios.get(getLink(govType, project))
    return json
  } catch (e) {
    sdk.log('failed to fetch data from s3 bucket:', Key)
    return {}
  }
}

async function setCache(govType, project, cache) {
  const Key = getKey(govType, project)

  try {
    await storeR2JSONString(Key, JSON.stringify(cache))
  } catch (e) {
    sdk.log('failed to write data to s3 bucket: ', Key)
  }
}

async function getTomlFile() {
  return getCache('config', 'tomlData')
}

async function setTomlFile(cache) {
  return setCache('config', 'tomlData', cache)
}

async function saveChartData(id, data) {
  return setCache('chart-data', id, data)
}


async function getChartData(id, data) {
  return getCache('chart-data', id)
}

module.exports = {
  getCache,
  setCache,
  getTomlFile,
  setTomlFile,
  saveChartData,
  getChartData,
}