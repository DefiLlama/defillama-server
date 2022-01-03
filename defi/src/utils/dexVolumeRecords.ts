require("dotenv").config({ path: __dirname + "/../../.env" });

import AWS from "aws-sdk";

const client = new AWS.DynamoDB.DocumentClient({
  ...(process.env.MOCK_DYNAMODB_ENDPOINT && {
    endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
    sslEnabled: false,
    secretAccessKey: process.env.MOCK_DYNAMODB_SAK,
    region: process.env.MOCK_DYNAMODB_REGION,
  }),
});
export const TableName = process.env.tableName!;

const createDynamoDbApi = (TableName: string) => ({
  get: (
    key: AWS.DynamoDB.DocumentClient.Key,
    params?: Omit<AWS.DynamoDB.DocumentClient.GetItemInput, "TableName">
  ) => client.get({ TableName, ...params, Key: key }).promise(),
  put: (
    item: AWS.DynamoDB.DocumentClient.PutItemInputAttributeMap,
    params?: Partial<AWS.DynamoDB.DocumentClient.PutItemInput>
  ) => client.put({ TableName, ...params, Item: item }).promise(),
  query: (params: Omit<AWS.DynamoDB.DocumentClient.QueryInput, "TableName">) =>
    client.query({ TableName, ...params }).promise(),
  update: (
    params: Omit<AWS.DynamoDB.DocumentClient.UpdateItemInput, "TableName">
  ) => client.update({ TableName, ...params }).promise(),
  delete: (
    params: Omit<AWS.DynamoDB.DocumentClient.DeleteItemInput, "TableName">
  ) => client.delete({ TableName, ...params }).promise(),
  batchGet: (keys: AWS.DynamoDB.DocumentClient.KeyList) =>
    client
      .batchGet({
        RequestItems: {
          [TableName]: {
            Keys: keys,
          },
        },
      })
      .promise(),
  scan: () => client.scan({ TableName }).promise(),
});

export const hourlyDexVolumeDb = createDynamoDbApi("dev-hourly-dex-volume");
export const dailyDexVolumeDb = createDynamoDbApi("dev-daily-dex-volume");
export const monthlyDexVolumeDb = createDynamoDbApi("dev-monthly-dex-volume");

export const getDexVolumeRecord =
  (db: any, pkHelper: any) =>
  (protocolId: string, timestamp: string | number) =>
    db
      .query({
        ExpressionAttributeValues: {
          ":pk": pkHelper(protocolId),
          ":sk": timestamp,
        },
        KeyConditionExpression: "PK = :pk and SK = :sk",
      })
      .then((res: any) => res.Items?.[0])
      .catch((e: any) => {
        console.error(e);
      });
export const hourlyVolumePk = (protocolId: string | number) =>
  `hourlyVolume#${protocolId}`;
export const dailyVolumePk = (protocolId: string | number) =>
  `dailyVolume#${protocolId}`;
export const monthlyVolumePk = (protocolId: string | number) =>
  `dailyVolume#${protocolId}`;

export const getHourlyDexVolumeRecord = getDexVolumeRecord(
  hourlyDexVolumeDb,
  hourlyVolumePk
);
export const getDailyDexVolumeRecord = getDexVolumeRecord(
  hourlyDexVolumeDb,
  dailyVolumePk
);
export const getMonthlyDexVolumeRecord = getDexVolumeRecord(
  hourlyDexVolumeDb,
  monthlyVolumePk
);
