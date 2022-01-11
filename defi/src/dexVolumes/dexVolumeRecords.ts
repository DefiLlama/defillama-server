require("dotenv").config({ path: __dirname + "/../../.env" });

import AWS from "aws-sdk";

import { HourlyEcosystemRecord } from "./dexVolume.types";

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
export const dexVolumeInfoDb = createDynamoDbApi("dev-dex-volume");

export const getTimeDexVolumeRecord = (db: any) => (id: number, unix: number) =>
  db
    .query({
      ExpressionAttributeValues: {
        ":id": id,
        ":unix": unix,
      },
      KeyConditionExpression: "id = :id and unix = :unix",
    })
    .then((res: any) => res.Items?.[0])
    .catch((e: any) => {
      console.error(e);
    });

export const getDexVolumeRecord = (id: number) =>
  dexVolumeInfoDb
    .query({
      ExpressionAttributeValues: {
        ":id": id,
      },
      KeyConditionExpression: "id = :id",
    })
    .then((res: any) => res.Items?.[0])
    .catch((e: any) => {
      console.error(e);
    });

export const getHourlyDexVolumeRecord =
  getTimeDexVolumeRecord(hourlyDexVolumeDb);
export const getDailyDexVolumeRecord = getTimeDexVolumeRecord(dailyDexVolumeDb);
export const getMonthlyDexVolumeRecord =
  getTimeDexVolumeRecord(monthlyDexVolumeDb);

export const putHourlyDexVolumeRecord = ({
  id,
  unix,
  hourlyVolume,
  dailyVolume,
  totalVolume,
  ecosystems,
}: HourlyEcosystemRecord) =>
  hourlyDexVolumeDb.put({
    id,
    unix,
    hourlyVolume,
    dailyVolume,
    totalVolume,
    ecosystems,
  });
