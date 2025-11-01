import { DynamoDBClient, } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocument, } from "@aws-sdk/lib-dynamodb"

const ddbClient = new DynamoDBClient({});
const client = DynamoDBDocument.from(ddbClient)

const TableName = "auth"
const authPK = (key: string) => `auth#${key}`

export async function checkApiKey(apiKey: string) {
    const item = await client.get({ Key: { PK: authPK(apiKey), }, TableName })
    if (!item.Item) {
        throw new Error("invalid api key")
    }
}