import { successResponse, wrap, IResponse, errorResponse } from "./utils";
import { getHistoricalValues } from "./utils/dynamodb";
import protocols from "./protocols/data";
import {
  getLastRecord,
  hourlyTvl,
  dailyTvl,
  dailyUsdTokensTvl,
  dailyTokensTvl,
  hourlyUsdTokensTvl,
  hourlyTokensTvl,
} from "./utils/getLastRecord";
import sluggify from "./utils/sluggify";
import { normalizeChain } from "./utils/normalizeChain";

function normalizeEthereum(balances: { [symbol: string]: number }) {
  if (balances?.ethereum !== undefined) {
    balances["WETH"] = (balances["WETH"] ?? 0) + balances["ethereum"];
    delete balances["ethereum"];
  }
  return balances;
}

type HistoricalTvls = AWS.DynamoDB.DocumentClient.ItemList | undefined
type HourlyTvl = AWS.DynamoDB.DocumentClient.AttributeMap | undefined

function replaceLast(historical: HistoricalTvls, last: HourlyTvl) {
  if (historical !== undefined && last !== undefined) {
    historical[historical.length - 1] = last
  }
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
  const [lastUsdHourlyRecord, lastUsdTokenHourlyRecord, lastTokenHourlyRecord, historicalUsdTvl, historicalUsdTokenTvl, historicalTokenTvl, module] = await Promise.all([
    getLastRecord(hourlyTvl(protocolData.id)),
    getLastRecord(hourlyUsdTokensTvl(protocolData.id)),
    getLastRecord(hourlyTokensTvl(protocolData.id)),
    getHistoricalValues(dailyTvl(protocolData.id)),
    getHistoricalValues(dailyUsdTokensTvl(protocolData.id)),
    getHistoricalValues(dailyTokensTvl(protocolData.id)),
    import(`../DefiLlama-Adapters/projects/${protocolData.module}`)
  ]);
  replaceLast(historicalUsdTvl, lastUsdHourlyRecord)
  replaceLast(historicalUsdTokenTvl, lastUsdTokenHourlyRecord)
  replaceLast(historicalTokenTvl, lastTokenHourlyRecord)
  let response = protocolData as any;
  if(module.methodology !== undefined){
    response.methodology = module.methodology;
  }
  response.chainTvls = {};
  protocolData.chains.concat(["tvl", "staking", "pool2"]).map(async (chain) => {
    const normalizedChain = normalizeChain(chain);
    const container = {} as any;

    container.tvl = historicalUsdTvl
      ?.map((item) => ({
        date: item.SK,
        totalLiquidityUSD: item[normalizedChain],
      }))
      .filter((item) => item.totalLiquidityUSD !== undefined);
    container.tokensInUsd = historicalUsdTokenTvl
      ?.map((item) => ({
        date: item.SK,
        tokens: normalizeEthereum(item[normalizedChain]),
      }))
      .filter((item) => item.tokens !== undefined);
    container.tokens = historicalTokenTvl
      ?.map((item) => ({
        date: item.SK,
        tokens: normalizeEthereum(item[normalizedChain]),
      }))
      .filter((item) => item.tokens !== undefined);
    if (container.tvl !== undefined && container.tvl.length > 0) {
      if (chain === "tvl") {
        response = {
          ...response,
          ...container,
        };
      } else {
        response.chainTvls[chain] = container;
      }
    }
  })

  return successResponse(response, 10 * 60); // 10 mins cache
};

export default wrap(handler);
