import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import axios from "axios";
import type { Readable } from "stream";

const datasetBucket = "defillama-datasets";
const publicBucketUrl = "https://defillama-datasets.llama.fi";

const R2_ENDPOINT = process.env.R2_ENDPOINT!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;

console.log("R2_ENDPOINT", R2_ENDPOINT);
console.log(
  "R2_ACCESS_KEY_ID",
  R2_ACCESS_KEY_ID.substring(0, 2) + "..." + R2_ACCESS_KEY_ID.substring(R2_ACCESS_KEY_ID.length - 2)
);
console.log(
  "R2_SECRET_ACCESS_KEY",
  R2_SECRET_ACCESS_KEY.substring(0, 2) + "..." + R2_SECRET_ACCESS_KEY.substring(R2_SECRET_ACCESS_KEY.length - 2)
);

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

export async function storeDatasetR2(filename: string, body: string | Readable, contentType = "text/csv") {
  const command = new PutObjectCommand({
    Bucket: datasetBucket,
    Key: `temp/${filename}`,
    Body: body,
    ContentType: contentType,
  });
  return await R2.send(command);
}

export async function storeLiqsR2(filename: string, body: string | Readable, contentType = "application/json") {
  const command = new PutObjectCommand({
    Bucket: datasetBucket,
    Key: `liqs/${filename}`,
    Body: body,
    ContentType: contentType,
  });
  return await R2.send(command);
}

export async function getCachedLiqsR2(protocol: string, chain: string) {
  const command = new GetObjectCommand({
    Bucket: datasetBucket,
    Key: `liqs/_cache/${protocol}/${chain}/latest.json`,
  });
  const data = await R2.send(command);
  return data.Body?.toString() ?? "";
}

export async function getExternalLiqsR2(protocol: string, chain: string) {
  const data = (await axios.get("https://liquidations-extra-9sja.onrender.com/" + protocol + "/" + chain)).data;
  return data;
}

export async function storeCachedLiqsR2(protocol: string, chain: string, body: string | Readable) {
  const command = new PutObjectCommand({
    Bucket: datasetBucket,
    Key: `liqs/_cache/${protocol}/${chain}/latest.json`,
    Body: body,
    ContentType: "application/json",
  });
  return await R2.send(command);
}

export function buildRedirectR2(filename: string, cache?: number) {
  return {
    statusCode: 307,
    body: "",
    headers: {
      Location: publicBucketUrl + `/temp/${filename}`,
      ...(cache !== undefined
        ? {
            "Cache-Control": `max-age=${cache}`,
          }
        : {}),
    },
  };
}

export const liquidationsFilename = `liquidations.json`;
