import AWS from "aws-sdk";

const client = new AWS.DynamoDB.DocumentClient({});

const TableName = "auth"

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
}
export default dynamodb

export async function getAllItems() {
    let items = [] as any[];
    const queryParams = {
        TableName
    } as {
        TableName:string,
        ExclusiveStartKey:{
            PK:string
        }
    }
    do {
      const result = await client.scan(queryParams).promise();
      if (result.Items !== undefined) {
        items = items.concat(result.Items);
      }
      queryParams.ExclusiveStartKey.PK = result.LastEvaluatedKey?.PK;
    } while (queryParams.ExclusiveStartKey.PK !== undefined);
    return items;
  }

export const authPK = (key:string)=>`auth#${key}`