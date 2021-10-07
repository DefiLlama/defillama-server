import { successResponse, wrap, IResponse } from "./utils";
import protocols from "./protocols/data";
import dynamodb from "./utils/dynamodb";
import {getLastRecord, hourlyTvl} from './utils/getLastRecord'
import { getClosestDayStartTimestamp } from "./utils/date";
import { normalizeChain } from "./utils/normalizeChain";

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const chain = event.pathParameters?.chain?.toLowerCase();
  const sumDailyTvls = {} as {
    [timestamp: number]: number | undefined;
  };
  let lastDailyTimestamp = 0;
  const historicalProtocolTvls = await Promise.all(
    protocols.map(async (protocol) => {
      if (protocol.category === "Chain") {
        return undefined;
      }
      if (
        chain !== undefined &&
        !protocol.chains
          .map((protocolChain) => protocolChain.toLowerCase())
          .includes(chain)
      ) {
        return undefined;
      }
      const [historicalTvl, lastTvl] = await Promise.all([dynamodb.query({
        ExpressionAttributeValues: {
          ":pk": `dailyTvl#${protocol.id}`,
        },
        KeyConditionExpression: "PK = :pk",
      }),
      getLastRecord(hourlyTvl(protocol.id))
      ]);
      if (historicalTvl.Items === undefined || historicalTvl.Items.length < 1) {
        return undefined;
      }
      const lastDailyItem = historicalTvl.Items[historicalTvl.Items.length - 1]
      if(lastTvl !== undefined && lastTvl.SK>lastDailyItem.SK){
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
    const { historicalTvl, protocol, lastTimestamp } = protocolTvl;
    const lastTvl = historicalTvl[historicalTvl.length - 1];
    if (lastTimestamp !== lastDailyTimestamp && (lastDailyTimestamp-lastTimestamp) < (2*24*3600)) {
      historicalTvl.push({
        ...lastTvl,
        SK: lastDailyTimestamp,
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
      if(typeof itemTvl === 'number' && !Number.isNaN(itemTvl)){
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
  return successResponse(response, 10 * 60); // 10 mins cache
};

export default wrap(handler);
