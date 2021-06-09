import { successResponse, wrap, IResponse } from "./utils";
import protocols from "./protocols/data";
import dynamodb from "./utils/dynamodb";
import { getClosestDayStartTimestamp } from "./date/getClosestDayStartTimestamp";
import {normalizeChain} from './utils/normalizeChain'

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
      if (protocol.name === "Uniswap v3" || protocol.category === "Chain") {
        return undefined;
      }
      if (chain !== undefined && !protocol.chains.map(protocolChain => protocolChain.toLowerCase()).includes(chain)) {
        return undefined;
      }
      const historicalTvl = await dynamodb.query({
        ExpressionAttributeValues: {
          ":pk": `dailyTvl#${protocol.id}`,
        },
        KeyConditionExpression: "PK = :pk",
      });
      if (historicalTvl.Items === undefined || historicalTvl.Items.length < 1) {
        return undefined
      }
      const lastTimestamp = getClosestDayStartTimestamp(historicalTvl.Items[historicalTvl.Items.length - 1].SK)
      lastDailyTimestamp = Math.max(lastDailyTimestamp, lastTimestamp)
      return {
        protocol,
        historicalTvl: historicalTvl.Items
      }
    })
  );
  historicalProtocolTvls.forEach((protocolTvl)=>{
    if(protocolTvl === undefined){
      return
    }
    const {historicalTvl, protocol} = protocolTvl;
    const lastTvl = historicalTvl[historicalTvl.length-1];
    if(lastTvl.SK !== lastDailyTimestamp){
      historicalTvl.push({
        ...lastTvl,
        SK: lastDailyTimestamp
      })
    }
    historicalTvl.forEach((item) => {
      const timestamp = getClosestDayStartTimestamp(item.SK);
      let itemTvl:number;
      if(chain === undefined){
        itemTvl = item.tvl;
      } else {
        itemTvl = item[normalizeChain(chain)]
        if(itemTvl === undefined){
          if(chain === protocol.chain.toLowerCase()){
            itemTvl = item.tvl;
          } else {
            return;
          }
        }
      }
      sumDailyTvls[timestamp] = itemTvl + (sumDailyTvls[timestamp] ?? 0);
    });
  })
  let minTimestamp = 1603757978;
  if(chain !== undefined && chain !== "ethereum") {
    minTimestamp = 1612837719;
  }
  Object.keys(sumDailyTvls).forEach((timestamp) => {
    if (Number(timestamp) < minTimestamp) {
      delete sumDailyTvls[Number(timestamp)];
    }
  });

  const response = Object.entries(sumDailyTvls).map(([timestamp, tvl]) => ({
    date: timestamp,
    totalLiquidityUSD: tvl,
  }));
  return successResponse(response, 10 * 60); // 10 mins cache
};

export default wrap(handler);
