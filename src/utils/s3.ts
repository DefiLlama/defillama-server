import aws from 'aws-sdk'
import type { Readable } from "stream"

const datasetBucket = 'defillama-datasets'

export async function store(filename:string, body:string|Readable|Buffer, extraOptions:any = {}){
  await new aws.S3().upload({
    Bucket: datasetBucket,
    Key: filename,
    Body: body,
    ACL: "public-read",
    ...extraOptions
  }).promise()
}
