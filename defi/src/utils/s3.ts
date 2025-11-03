import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import type { Readable } from "stream";

let client: S3Client | null = null;

function getClient() {
  if (!client) client = new S3Client({});
  return client;
}

const datasetBucket = "defillama-datasets";

function next21Minutedate() {
  const dt = new Date();
  dt.setHours(dt.getHours() + 1);
  dt.setMinutes(21);
  return dt;
}

export async function store(
  filename: string,
  body: string | Readable | Buffer,
  hourlyCache = false,
  compressed = true
) {
  const command = new PutObjectCommand({
      Bucket: datasetBucket,
      Key: filename,
      Body: body,
      ACL: "public-read",
      ...(hourlyCache && {
        Expires: next21Minutedate(),
        ...(compressed && {
          ContentEncoding: "br",
        }),
        ContentType: "application/json",
      }),
  })
  await getClient().send(command);
}

export async function storeDataset(filename: string, body: string | Readable, contentType = "text/csv") {
  const command = new PutObjectCommand({
      Bucket: datasetBucket,
      Key: `temp/${filename}`,
      Body: body,
      ACL: "public-read",
      ContentType: contentType,
    })
    
  await getClient().send(command);
}

export function buildRedirect(filename: string, cache?: number) {
  return {
    statusCode: 307,
    body: "",
    headers: {
      Location: `https://defillama-datasets.s3.eu-central-1.amazonaws.com/temp/${filename}`,
      ...(cache !== undefined
        ? {
            "Cache-Control": `max-age=${cache}`,
          }
        : {}),
    },
  };
}
