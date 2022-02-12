import dynamodb from "./dynamodb";

export default async function getTVLOfRecordClosestToTimestamp(
  PK: string,
  timestamp: number,
  searchWidth: number
) {
  return dynamodb
    .query({
      ExpressionAttributeValues: {
        ":pk": PK,
        ":begin": timestamp - searchWidth,
        ":end": timestamp + searchWidth,
      },
      KeyConditionExpression: "PK = :pk AND SK BETWEEN :begin AND :end",
    })
    .then((records) => {
      if (records.Items == undefined || records.Items.length == 0) {
        return {
          SK: undefined,
        };
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
