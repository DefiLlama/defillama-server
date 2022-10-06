import dynamodb from "./dynamodb";

export default async function getRecordEarliestTimestamp(PK: string) {
  return dynamodb
    .query({
      ExpressionAttributeValues: {
        ":pk": PK,
        ":sk": 0
      },
      KeyConditionExpression: "PK = :pk AND SK > :sk",
      ScanIndexForward: true
    })
    .then((records) => {
      if (records.Items == undefined || records.Items.length == 0) {
        return {
          SK: undefined
        };
      }
      return records.Items[0];
    });
}
