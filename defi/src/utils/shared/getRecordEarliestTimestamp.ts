import dynamodb from "./dynamodb";

export default async function getRecordEarliestTimestamp(PK: string) {
  return dynamodb
    .query({
      ExpressionAttributeValues: {
        ":pk": PK,
        ":sk": 0
      },
      KeyConditionExpression: "PK = :pk AND SK > :sk",
      Limit: 1,
      ScanIndexForward: true
    })
    .then((res) => res.Items?.[0]);
}
