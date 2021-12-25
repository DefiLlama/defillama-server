const protocolName = "anchor"
const TableName = "anchor-terra"; // backup table

import dynamodb from "../utils/shared/dynamodb";
import { dailyTokensTvl, dailyTvl, dailyUsdTokensTvl } from "../utils/getLastRecord";
import { getProtocol } from "./utils";
import AWS from "aws-sdk";

const client = new AWS.DynamoDB.DocumentClient({});

async function main() {
  const protocol = getProtocol(protocolName)
  for (const tvlFunc of [dailyTvl, dailyTokensTvl, dailyUsdTokensTvl]) {
    const data = await dynamodb.query({
      ExpressionAttributeValues: {
        ":pk": tvlFunc(protocol.id),
      },
      KeyConditionExpression: "PK = :pk",
    });
    for (const d of data.Items ?? []) {
      await dynamodb.delete({
        Key: {
          PK: d.PK,
          SK: d.SK,
        },
      });
    }
    const backupData = await  client.query({
      TableName,
      ExpressionAttributeValues: {
        ":pk": tvlFunc(protocol.id),
      },
      KeyConditionExpression: "PK = :pk",
    }).promise();
    for (const d of backupData.Items ?? []) {
      await dynamodb.put(d);
    }
  }
}
main();
