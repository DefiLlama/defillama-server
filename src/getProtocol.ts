import { successResponse, wrap, IResponse, errorResponse } from "./utils";
import { getHistoricalValues } from "./utils/dynamodb";
import protocols from "./protocols/data";
import {
  getLastRecord,
  hourlyTvl,
  dailyTvl,
  dailyUsdTokensTvl,
  dailyTokensTvl,
} from "./utils/getLastRecord";
import sluggify from "./utils/sluggify";
import { normalizeChain } from './utils/normalizeChain'

function normalizeEthereum(balances:{
  [symbol:string]:number
}){
  if(balances?.ethereum !== undefined){
    balances['WETH'] = (balances['WETH'] ?? 0) + balances['ethereum']
    delete balances['ethereum']
  }
  return balances
}

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const protocolName = event.pathParameters?.protocol?.toLowerCase();
  const protocolData = protocols.find(
    (prot) => sluggify(prot) === protocolName
  );
  if (protocolData === undefined) {
    return errorResponse({
      message: "Protocol is not in our database",
    });
  }
  const lastHourlyRecord = getLastRecord(hourlyTvl(protocolData.id));
  const historicalUsdTvl = getHistoricalValues(dailyTvl(protocolData.id))
  const historicalUsdTokenTvl = getHistoricalValues(dailyUsdTokensTvl(protocolData.id))
  const historicalTokenTvl = getHistoricalValues(dailyTokensTvl(protocolData.id))
  let response = protocolData as any;
  response.chainTvls = {}
  await Promise.all(protocolData.chains.concat(['tvl']).map(async chain => {
    const normalizedChain = normalizeChain(chain)
    const container = {} as any

    container.tvl = (await historicalUsdTvl)?.map((item) => ({
      date: item.SK,
      totalLiquidityUSD: item[normalizedChain],
    })).filter(item => item.totalLiquidityUSD !== undefined);
    container.tokensInUsd = (await historicalUsdTokenTvl)?.map((item) => ({
      date: item.SK,
      tokens: normalizeEthereum(item[normalizedChain]),
    })).filter(item => item.tokens !== undefined);
    container.tokens = (await historicalTokenTvl)?.map((item) => ({
      date: item.SK,
      tokens: normalizeEthereum(item[normalizedChain]),
    })).filter(item => item.tokens !== undefined);
    if (container.tvl !== undefined && container.tvl.length > 0) {
      const lastItem = (await lastHourlyRecord);
      if (lastItem?.[normalizedChain] !== undefined) {
        container.tvl[container.tvl.length - 1] = {
          date: lastItem.SK,
          totalLiquidityUSD: lastItem[normalizedChain],
        };
      }
      if(chain ==='tvl'){
        response={
          ...response,
          ...container
        };
      } else {
        response.chainTvls[chain] = container;
      }
    }
  }))

  return successResponse(response, 10 * 60); // 10 mins cache
};

export default wrap(handler);
