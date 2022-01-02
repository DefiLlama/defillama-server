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

export function getHourlyDexVolumeRecord(PK: string, SK: string | number) {
  return hourlyDexVolumeDb
    .query({
      ExpressionAttributeValues: {
        ":pk": PK,
        ":sk": SK,
      },
      KeyConditionExpression: "PK = :pk and SK = :sk",
    })
    .then((res) => res.Items?.[0])
    .catch((e) => {
      console.error(e);
    });
}

export const hourlyVolume = (protocolId: string) =>
  `hourlyVolume#${protocolId}`;
export const dailyVolume = (protocolId: string) => `dailyVolume#${protocolId}`;
export const monthlyVolume = (protocolId: string) =>
  `dailyVolume#${protocolId}`;
