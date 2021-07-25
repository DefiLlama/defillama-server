import allProtocols from "./protocols/data";
import craftCsvDataset from './storeTvlUtils/craftCsvDataset'
import { wrapScheduledLambda } from "./utils/wrap";
import aws from 'aws-sdk'

const handler = async (_event: any) => {
  const csv = await craftCsvDataset(allProtocols);
  await new aws.S3().putObject({
    Bucket: 'defillama-datasets',
    Key: 'all.csv',
    Body: csv
  }).promise()
};

export default wrapScheduledLambda(handler);
