import dynamodb from "./dynamodb";

const maxSearchWidth = 60 * 60 * 24 * 2; // 2 days
const defailtSearchWidth = 60 * 60 * 6; // 6 hours

export async function getRecordClosestToTimestamp(
  PK: any,
  timestamp: number,
  searchWidth: number | undefined = undefined
) {

  if (!searchWidth && searchWidth !== 0)
    searchWidth = defailtSearchWidth;

  if (searchWidth > maxSearchWidth)
    searchWidth = maxSearchWidth;


  // Fetch the first item >= timestamp (ascending order), limited by search width
  const greaterEqualQuery = dynamodb.query({
    ExpressionAttributeValues: {
      ":pk": PK,
      ":timestamp": timestamp,
      ":maxTimestamp": timestamp + searchWidth
    },
    KeyConditionExpression: "PK = :pk AND SK BETWEEN :timestamp AND :maxTimestamp",
    ScanIndexForward: true, // ascending order
    Limit: 1 // only need the first item
  });

  // Fetch the first item <= timestamp (descending order), limited by search width
  const lessEqualQuery = dynamodb.query({
    ExpressionAttributeValues: {
      ":pk": PK,
      ":timestamp": timestamp,
      ":minTimestamp": timestamp - searchWidth
    },
    KeyConditionExpression: "PK = :pk AND SK BETWEEN :minTimestamp AND :timestamp",
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