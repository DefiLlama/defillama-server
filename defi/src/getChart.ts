import { successResponse, wrap, IResponse } from "./utils/shared";
import protocols from "./protocols/data";
import dynamodb from "./utils/shared/dynamodb";
import { getLastRecord, hourlyTvl } from './utils/getLastRecord'
import { getClosestDayStartTimestamp } from "./utils/date";
import { normalizeChain } from "./utils/normalizeChain";
import { secondsInHour } from './utils/date'
import { excludeProtocolInCharts } from "./storeGetCharts";

async function craftChartsResponse(chain:string|undefined){
  const sumDailyTvls = {} as {
    [timestamp: number]: number | undefined;
  };
  const normalizedChain = chain === undefined?undefined: normalizeChain(decodeURI(chain))
  let lastDailyTimestamp = 0;
  const historicalProtocolTvls = await Promise.all(
    protocols.map(async (protocol) => {
      if(excludeProtocolInCharts(protocol)){
        return undefined;
      }
      const lastTvl = await getLastRecord(hourlyTvl(protocol.id))
      if (
        normalizedChain !== undefined &&
        lastTvl?.[normalizedChain] === undefined &&
        protocol.chain.toLowerCase() !== chain
      ) {
        return undefined;
      }
      const historicalTvl = await dynamodb.query({
          ExpressionAttributeValues: {
            ":pk": `dailyTvl#${protocol.id}`,
          },
          KeyConditionExpression: "PK = :pk",
      })
      if (historicalTvl.Items === undefined || historicalTvl.Items.length < 1) {
        return undefined;
      }
      const lastDailyItem = historicalTvl.Items[historicalTvl.Items.length - 1]
      if (lastTvl !== undefined && lastTvl.SK > lastDailyItem.SK && (lastDailyItem.SK + secondsInHour * 25) > lastTvl.SK) {
        lastTvl.SK = lastDailyItem.SK
        historicalTvl.Items[historicalTvl.Items.length - 1] = lastTvl
      }
      const lastTimestamp = getClosestDayStartTimestamp(
        historicalTvl.Items[historicalTvl.Items.length - 1].SK
      );
      lastDailyTimestamp = Math.max(lastDailyTimestamp, lastTimestamp);
      return {
        protocol,
        historicalTvl: historicalTvl.Items,
        lastTimestamp
      };
    })
  );
  historicalProtocolTvls.forEach((protocolTvl) => {
    if (protocolTvl === undefined) {
      return;
    }
    let { historicalTvl, protocol, lastTimestamp } = protocolTvl;
    const lastTvl = historicalTvl[historicalTvl.length - 1];
    while (lastTimestamp < lastDailyTimestamp) {
      lastTimestamp = getClosestDayStartTimestamp(lastTimestamp+24*secondsInHour)
      historicalTvl.push({
        ...lastTvl,
        SK: lastTimestamp,
      });
    }
    historicalTvl.forEach((item) => {
      const timestamp = getClosestDayStartTimestamp(item.SK);
      let itemTvl: number;
      if (chain === undefined) {
        itemTvl = item.tvl;
      } else {
        itemTvl = item[normalizeChain(chain)];
        if (itemTvl === undefined) {
          if (chain === protocol.chain.toLowerCase()) {
            itemTvl = item.tvl;
          } else {
            return;
          }
        }
      }
      if (typeof itemTvl === 'number' && !Number.isNaN(itemTvl)) {
        sumDailyTvls[timestamp] = itemTvl + (sumDailyTvls[timestamp] ?? 0);
      } else {
        console.log("itemTvl is NaN", itemTvl, item, protocol, lastTimestamp, historicalTvl)
      }
    });
  });

  const response = Object.entries(sumDailyTvls).map(([timestamp, tvl]) => ({
    date: timestamp,
    totalLiquidityUSD: tvl,
  }));
  return response
}

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const chain = event.pathParameters?.chain?.toLowerCase();
  const response = await craftChartsResponse(chain);
  return successResponse(response, 10 * 60); // 10 mins cache
};

export default wrap(handler);
