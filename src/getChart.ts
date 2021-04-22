import { successResponse, wrap, IResponse } from "./utils";
import protocols from "./protocols/data";
import dynamodb from "./utils/dynamodb";
import {getClosestDayStartTimestamp} from "./date/getClosestDayStartTimestamp"

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const chain = event.pathParameters?.chain?.toLowerCase();
  console.log("chain", chain);
  const sumDailyTvls = {} as {
    [timestamp: number]: number | undefined;
  };
  await Promise.all(
    protocols.map(async (protocol) => {
      if (chain !== undefined && protocol.chain.toLowerCase() !== chain) {
        return;
      }
      const historicalTvl = await dynamodb.query({
        ExpressionAttributeValues: {
          ":pk": `dailyTvl#${protocol.id}`,
        },
        KeyConditionExpression: "PK = :pk",
      });
      if (historicalTvl.Items !== undefined) {
        historicalTvl.Items.forEach((item) => {
          const timestamp = getClosestDayStartTimestamp(item.SK);
          sumDailyTvls[timestamp] = item.tvl + (sumDailyTvls[timestamp] ?? 0);
        });
      }
    })
  );
  if(chain !== undefined && chain !== 'ethereum'){
    Object.keys(sumDailyTvls).forEach(timestamp=>{
      if(Number(timestamp)<1612837719){
        delete sumDailyTvls[Number(timestamp)]
      }
    })
  }

  const response = Object.entries(sumDailyTvls).map(([timestamp, tvl]) => ({
    date: timestamp,
    totalLiquidityUSD: tvl,
  }));
  return successResponse(response, 10 * 60); // 10 mins cache
};

export default wrap(handler);
