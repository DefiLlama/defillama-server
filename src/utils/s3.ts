import aws from 'aws-sdk'
import type { Readable } from "stream"

const datasetBucket = 'defillama-datasets'

function next21Minutedate() {
  const dt = new Date()
  dt.setHours(dt.getHours() + 1);
  dt.setMinutes(21)
  return dt
}

export async function store(filename: string, body: string | Readable | Buffer, hourlyCache = false, compressed = true) {
  await new aws.S3().upload({
    Bucket: datasetBucket,
    Key: filename,
    Body: body,
    ACL: "public-read",
    ...(hourlyCache && {
      Expires: next21Minutedate(),
      ...(compressed && {
        ContentEncoding: 'br',
      }),
      ContentType: "application/json"
    }),
  }).promise()
}

export async function storeDataset(filename: string, body: string) {
  await new aws.S3().upload({
    Bucket: datasetBucket,
    Key: `temp/${filename}`,
    Body: body,
    ACL: "public-read",
    ContentType: "text/csv"
  }).promise()
}

