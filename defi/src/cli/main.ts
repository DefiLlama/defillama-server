import AWS from "aws-sdk";
const db = require("../../imported-db/defillama-db.json");
import { getClosestDayStartTimestamp } from "../utils/date";

AWS.config.update({ region: "eu-central-1" });
const client = new AWS.DynamoDB.DocumentClient();

const hourly = db[4].data;
const daily = db[5].data;
const ts = (date: string) => Math.round(new Date(date).getTime() / 1000);
const hourlyPrefix = "hourlyTvl";
const dailyPrefix = "dailyTvl";

const table = daily;
const dynamoPrefix = dailyPrefix;
const TableName = "dev-table";
const maxProtocolId = 300;

const deleteOverlapping = async () => {
  for (const item of table) {
    const SK = ts(item.ts);
    const newSK = getClosestDayStartTimestamp(SK);
    const tvl = Number(item.TVL);
    const PK = `${dynamoPrefix}#${item.pid}`;
    console.log("delete", PK, SK);
    await client
      .delete({
        TableName,
        Key: {
          PK,
          SK
        }
      })
      .promise();
    await client
      .put({
        TableName,
        Item: {
          PK,
          SK: newSK,
          tvl
        }
      })
      .promise();
  }
};

const deleteAtTime = async () => {
  for (let i = 0; i < maxProtocolId; i++) {
    const SK = 1617580800;
    const PK = `${dynamoPrefix}#${i}`;
    await client
      .delete({
        TableName,
        Key: {
          PK,
          SK
        }
      })
      .promise();
  }
};

const searchInterval = 3600 * 5; // 5 hrs
function getTVLOfRecordClosestToTimestamp(PK: string, timestamp: number) {
  return client
    .query({
      TableName,
      ExpressionAttributeValues: {
        ":pk": PK,
        ":begin": timestamp - searchInterval,
        ":end": timestamp + searchInterval
      },
      KeyConditionExpression: "PK = :pk AND SK BETWEEN :begin AND :end"
    })
    .promise()
    .then((records) => {
      if (records.Items == undefined || records.Items.length == 0) {
        return null;
      }
      let closest = records.Items[0];
      for (const item of records.Items.slice(1)) {
        if (Math.abs(item.SK - timestamp) < Math.abs(closest.SK - timestamp)) {
          closest = item;
        }
      }
      return closest;
    });
}

const fillTimestamp = 1608776919;
async function fillDailyGaps() {
  for (let i = 0; i < maxProtocolId; i++) {
    const PK = `${dailyPrefix}#${i}`;
    const hourlyItem = await getTVLOfRecordClosestToTimestamp(
      PK,
      fillTimestamp
    );
    console.log(hourlyItem);
    if (hourlyItem !== null) {
      await client
        .put({
          TableName,
          Item: {
            PK,
            SK: getClosestDayStartTimestamp(hourlyItem.SK),
            tvl: hourlyItem.tvl
          }
        })
        .promise();
    }
  }
}
