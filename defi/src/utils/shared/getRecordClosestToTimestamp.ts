import dynamodb from "./dynamodb";

export async function getRecordClosestToTimestamp(
  PK: any,
  timestamp: number,
  searchWidth: number | undefined = undefined
) {
  // Fetch the first item >= timestamp (ascending order)
  const greaterEqualQuery = dynamodb.query({
    ExpressionAttributeValues: {
      ":pk": PK,
      ":timestamp": timestamp
    },
    KeyConditionExpression: "PK = :pk AND SK >= :timestamp",
    ScanIndexForward: true, // ascending order
    Limit: 1 // only need the first item
  });

  // Fetch the first item <= timestamp (descending order)
  const lessEqualQuery = dynamodb.query({
    ExpressionAttributeValues: {
      ":pk": PK,
      ":timestamp": timestamp
    },
    KeyConditionExpression: "PK = :pk AND SK <= :timestamp",
    ScanIndexForward: false, // descending order
    Limit: 1 // only need the first item
  });

  const [greaterEqualResult, lessEqualResult] = await Promise.all([
    greaterEqualQuery,
    lessEqualQuery
  ]);

  const greaterEqualItem = greaterEqualResult.Items?.[0];
  const lessEqualItem = lessEqualResult.Items?.[0];

  // If neither exists, return undefined SK
  if (!greaterEqualItem && !lessEqualItem) {
    return {
      SK: undefined
    };
  }

  // If only one exists, return it
  if (!greaterEqualItem) {
    return lessEqualItem;
  }
  if (!lessEqualItem) {
    return greaterEqualItem;
  }

  // Both exist, pick the closest one to timestamp
  const greaterEqualDiff = Math.abs(greaterEqualItem.SK - timestamp);
  const lessEqualDiff = Math.abs(lessEqualItem.SK - timestamp);
  const closest = greaterEqualDiff < lessEqualDiff ? greaterEqualItem : lessEqualItem;

  // If a search width is provided, return the closest item if it is within the search width
  if (!searchWidth) return closest;
  if (Math.abs(closest.SK - timestamp) > searchWidth) return { SK: undefined };
  return closest;
}