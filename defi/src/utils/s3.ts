import aws from "aws-sdk";
import axios from "axios";
import type { Readable } from "stream";

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
  await new aws.S3()
    .upload({
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
    .promise();
}

export async function storeDataset(filename: string, body: string | Readable, contentType = "text/csv") {
  await new aws.S3()
    .upload({
      Bucket: datasetBucket,
      Key: `temp/${filename}`,
      Body: body,
      ACL: "public-read",
      ContentType: contentType,
    })
    .promise();
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
