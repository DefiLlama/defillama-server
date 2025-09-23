require('dotenv').config();
import AWS from "aws-sdk";


AWS.config.update({ region: process.env.AWS_REGION });

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