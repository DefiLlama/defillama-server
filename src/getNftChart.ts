
import { successResponse, wrap, IResponse } from "./utils";
import collections, { NFTCollection } from "./nfts/collections";
import dynamodb from "./utils/dynamodb";
import { getClosestDayStartTimestamp } from "./utils/date";

interface CollectionMarketCapAtTime {
  collectionId: string,
  marketCapUsd: number,
  timestamp: number,
}
interface dailyMarketCapMap {
  [timestamp: number]: number | undefined
}

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const chain = event.pathParameters?.chain?.toLowerCase();
  const filteredCollections = chain === undefined ? collections : collections.filter(collection => collection.chain === chain)

  const dailyCollectionMarketCaps: any[] = (await Promise.all(
    filteredCollections.map(async collection => {
      const collectionData = await dynamodb.query({
        ExpressionAttributeValues: {
          ":pk": `nfts#${collection.id}`,
        },
        KeyConditionExpression: "PK = :pk",
      })
      return collectionData.Items?.reduce((mktCapPerDay, dataItem) => {
        return {
          ...mktCapPerDay,
          [getClosestDayStartTimestamp(dataItem.SK)]: dataItem.marketCapUsd,
        }
      }, {})
    })
  ))
  .filter(collectionData => collectionData !== undefined && collectionData.length > 0)
  const sumDailyMarketCaps = dailyCollectionMarketCaps.reduce((sumDailyMarketCap, collectionDailyMarketCaps) => {
    Object.entries(collectionDailyMarketCaps).forEach(([key, value]) => {
      sumDailyMarketCap[key] = (sumDailyMarketCap[key] ?? 0) + value
    })
    return sumDailyMarketCap
  }, {})

  const response = Object.entries(sumDailyMarketCaps).map(([timestamp, mktCap]) => ({
    date: timestamp,
    totalMarketCapUsd: mktCap,
  }));
  return successResponse(response, 10 * 60); // 10 mins cache
}

export default wrap(handler);