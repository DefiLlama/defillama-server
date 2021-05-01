import dynamodb from "../utils/dynamodb";
import { secondsBetweenCallsExtra } from "../utils/date";


export default function getTVLOfRecordClosestToTimestamp(PK: string, timestamp: number) {
  return dynamodb
    .query({
      ExpressionAttributeValues: {
        ":pk": PK,
        ":begin": timestamp - secondsBetweenCallsExtra,
        ":end": timestamp + secondsBetweenCallsExtra,
      },
      KeyConditionExpression: "PK = :pk AND SK BETWEEN :begin AND :end",
    })
    .then((records) => {
      if (records.Items == undefined || records.Items.length == 0) {
        return {
          SK: undefined,
          tvl: 0,
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
