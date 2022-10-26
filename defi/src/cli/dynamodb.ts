import AWS from "aws-sdk";

AWS.config.update({ region: "eu-central-1" });
export const client = new AWS.DynamoDB.DocumentClient();

export const dateToUNIXTimestamp = (date: string) =>
  Math.round(new Date(date).getTime() / 1000);
const step = 25;
export const hourlyPrefix = "hourlyTvl";
export const dailyPrefix = "dailyTvl";

export const dynamoPrefix = dailyPrefix;
export const TableName = "staging-table";
export const maxProtocolId = 300;

export const getDailyTxs = (protocolId: string) =>
  client
    .query({
      TableName,
      ExpressionAttributeValues: {
        ":pk": `${dailyPrefix}#${protocolId}`,
      },
      KeyConditionExpression: "PK = :pk",
    })
    .promise()
    .then((result) => result.Items);
