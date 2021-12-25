import AWS from "aws-sdk";
import sleep from './sleep';

const client = new AWS.DynamoDB.DocumentClient({
  ...(process.env.MOCK_DYNAMODB_ENDPOINT && {
    endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
    sslEnabled: false,
    region: "local",
  }),
});
export const TableName = process.env.tableName!;

const dynamodb = {
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
};
export default dynamodb;

export function getHistoricalValues(pk: string) {
  return dynamodb
    .query({
      ExpressionAttributeValues: {
        ":pk": pk,
      },
      KeyConditionExpression: "PK = :pk",
    })
    .then((result) => result.Items);
}

const maxWriteRetries = 6; // Total wait time if all requests fail ~= 1.2s
async function underlyingBatchWrite(items: any[], retryCount: number, failOnError: boolean): Promise<void> {
  const output = await client
    .batchWrite({
      RequestItems: {
        [TableName]: items,
      },
    })
    .promise();
  const unprocessed = output.UnprocessedItems?.[TableName] ?? [];
  if (unprocessed.length > 0) {
    // Retry algo
    if (retryCount < maxWriteRetries) {
      const wait = (2 ** retryCount) * 10
      const jitter = Math.random()*wait - wait/2;
      await sleep(wait + jitter);
      return underlyingBatchWrite(unprocessed, retryCount + 1, failOnError);
    } else if (failOnError) {
      console.log("throttled", output?.UnprocessedItems)
      throw new Error("Write requests throttled")
    }
  }
}

const batchWriteStep = 25; // Max items written at once are 25
// IMPORTANT: Duplicated items will be pruned
export async function batchWrite(items: AWS.DynamoDB.DocumentClient.PutItemInputAttributeMap[], failOnError: boolean) {
  const writeRequests = [];
  for (let i = 0; i < items.length; i += batchWriteStep) {
    const itemsToWrite = items.slice(i, i + batchWriteStep);
    const nonDuplicatedItems = itemsToWrite.filter((item, index) =>
      // Could be optimized to O(nlogn) but not worth it
      itemsToWrite
        .slice(0, index)
        .every(
          (checkedItem) =>
            !(checkedItem.PK === item.PK && checkedItem.SK === item.SK)
        )
    );
    writeRequests.push(underlyingBatchWrite(
      nonDuplicatedItems.map((item) => ({ PutRequest: { Item: item } })),
      0,
      failOnError
    ));
  }
  await Promise.all(writeRequests);
}

const batchGetStep = 100; // Max 100 items per batchGet
export function batchGet(keys: { PK: string; SK: number }[]) {
  const requests = [];
  for (let i = 0; i < keys.length; i += batchGetStep) {
    requests.push(
      dynamodb
        .batchGet(keys.slice(i, i + batchGetStep))
        .then((items) => items.Responses![TableName])
    );
  }
  return Promise.all(requests).then((returnedRequests) =>
    ([] as any[]).concat(...returnedRequests)
  );
}
