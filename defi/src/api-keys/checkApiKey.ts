import AWS from "aws-sdk";

const client = new AWS.DynamoDB.DocumentClient({});

const TableName = "auth"
const authPK = (key:string)=>`auth#${key}`

export async function checkApiKey(apiKey: string) {
    const item = await client.get({
        Key:{
            PK: authPK(apiKey),
        },
        TableName
    }).promise()
    if (!item.Item) {
        throw new Error("invalid api key")
    }
}