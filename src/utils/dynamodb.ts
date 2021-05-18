import AWS from "aws-sdk";

const client = new AWS.DynamoDB.DocumentClient({
  ...(process.env.MOCK_DYNAMODB_ENDPOINT && {
    endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
    sslEnabled: false,
    region: "local",
  }),
});
const TableName = process.env.tableName ?? "test-table";

const dynamodb = {
  get: (params: Omit<AWS.DynamoDB.DocumentClient.GetItemInput, "TableName">) =>
    client.get({ TableName, ...params }).promise(),
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
  batchWrite: (items: AWS.DynamoDB.DocumentClient.BatchWriteItemRequestMap[]) =>
    client
      .batchWrite({
        RequestItems: {
          [TableName]: items.map((item) => ({ PutRequest: { Item: item } })),
        },
      })
      .promise(),
  scan: () => client.scan({ TableName }).promise(),
};
export default dynamodb;

export function getHistoricalValues(pk:string){
  return dynamodb.query({
    ExpressionAttributeValues: {
      ":pk": pk,
    },
    KeyConditionExpression: "PK = :pk",
  }).then(result=>result.Items);
}