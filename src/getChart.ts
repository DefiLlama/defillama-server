import { successResponse, wrap, IResponse } from "./utils";
import protocols from "./protocols/data";
import dynamodb from "./utils/dynamodb";

function getClosestDayStartTimestamp(timestamp: number) {
  const dt = new Date(timestamp * 1000);
  dt.setHours(0, 0, 0, 0);
  const prevDayTimestamp = Math.floor(dt.getTime() / 1000);
  dt.setHours(24);
  const nextDayTimestamp = Math.floor(dt.getTime() / 1000);
  if (
    Math.abs(prevDayTimestamp - timestamp) <
    Math.abs(nextDayTimestamp - timestamp)
  ) {
    return prevDayTimestamp;
  } else {
    return nextDayTimestamp;
  }
}

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
