import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import axios from "axios";
import type { Readable } from "stream";

const datasetBucket = "defillama-datasets";
const publicBucketUrl = "https://defillama-datasets.llama.fi";

const R2_ENDPOINT = "https://" + process.env.R2_ENDPOINT!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;

const R2 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

function next21Minutedate() {
  const dt = new Date();
  dt.setHours(dt.getHours() + 1);
  dt.setMinutes(21);
  return dt;
}

export async function storeR2(
  filename: string,
  body: string | Readable | Buffer,
  hourlyCache = false,
  compressed = true
) {
  const command = new PutObjectCommand({
    Bucket: datasetBucket,
    Key: filename,
    Body: body,
    ...(hourlyCache && {
      Expires: next21Minutedate(),
      ...(compressed && {
        ContentEncoding: "br",
      }),
      ContentType: "application/json",
    }),
  });
  return await R2.send(command);
}

export async function deleteR2(
  filename: string,
) {
  const command = new DeleteObjectsCommand({
    Bucket: datasetBucket,
    Delete: {
      Objects: [
        {
          Key: filename
        }
      ]
    } 
  })
  return await R2.send(command)
}

export async function storeR2JSONString(filename: string, body: string | Readable, cache?: number) {
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

export async function getR2JSONString(filename: string) {
  const command = new GetObjectCommand({
    Bucket: datasetBucket,
    Key: filename,
  });
  const data = await R2.send(command);
  return JSON.parse(await data.Body?.transformToString() as string)
}

export async function getR2(filename: string) {
  const command = new GetObjectCommand({
    Bucket: datasetBucket,
    Key: filename,
  });
  const data = await R2.send(command);
  return {
    body: await data.Body?.transformToString(),
    lastModified: data.LastModified,
  };
}

export async function storeDatasetR2(
  filename: string,
  body: string | Readable,
  contentType = "text/csv",
  cache?: number
) {
  const command = new PutObjectCommand({
    Bucket: datasetBucket,
    Key: `temp/${filename}`,
    Body: body,
    ContentType: contentType,
    ...(!!cache
      ? {
          CacheControl: `max-age=${cache}`,
        }
      : {}),
  });
  return await R2.send(command);
}

export async function storeLiqsR2(
  filename: string,
  body: string | Readable,
  contentType = "application/json",
  cache?: number
) {
  const command = new PutObjectCommand({
    Bucket: datasetBucket,
    Key: `liqs/${filename}`,
    Body: body,
    ContentType: contentType,
    ...(!!cache
      ? {
          CacheControl: `max-age=${cache}`,
        }
      : {}),
  });
  console.log("Storing liqs", `liqs/${filename}`);
  return await R2.send(command);
}

export async function getCachedLiqsR2(protocol: string, chain: string) {
  const command = new GetObjectCommand({
    Bucket: datasetBucket,
    Key: `liqs/_cache/${protocol}/${chain}/latest.json`,
  });
  const data = await R2.send(command);
  return data.Body?.transformToString();
}

export async function getExternalLiqsR2(protocol: string, chain: string) {
  const data = (await axios.get("https://liquidations.llama.fi/" + protocol + "/" + chain)).data;
  return data;
}

export async function storeCachedLiqsR2(protocol: string, chain: string, body: string | Readable, cache?: number) {
  const command = new PutObjectCommand({
    Bucket: datasetBucket,
    Key: `liqs/_cache/${protocol}/${chain}/latest.json`,
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

export function buildRedirectR2(filename: string, cache?: number) {
  return {
    statusCode: 307,
    body: "",
    headers: {
      Location: publicBucketUrl + `/temp/${filename}`,
      ...(!!cache
        ? {
            "Cache-Control": `max-age=${cache}`,
          }
        : {}),
    },
  };
}

export const liquidationsFilename = `liquidations.json`;

export async function deleteProtocolCache(protocolId: string) {
  const cacheKey = (useNewChainNames: boolean, useHourlyData: boolean) =>
    `protocolCache/${protocolId}-${useNewChainNames}-${useHourlyData}`;
  const keys = [
    [true, true],
    [true, false],
    [false, true],
    [false, false],
  ].map((t) => ({ Key: cacheKey(t[0], t[1]) }));
  const command = new DeleteObjectsCommand({
    Bucket: datasetBucket,
    Delete: {
      Objects: keys,
    },
  });
  return await R2.send(command);
}
