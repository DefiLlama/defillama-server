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
import { nonChains, getChainDisplayName, chainCoingeckoIds } from "./utils/normalizeChain";

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
  console.log(protocolName)
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
  if(module.misrepresentedTokens !== undefined){
    response.misrepresentedTokens = true;
  }
  if(module.hallmarks !== undefined){
    response.hallmarks = module.hallmarks;
  }
  response.chainTvls = {};
  const chains:string[] = []
  response.chains = chains
  const currentChainTvls: {[chain:string]:number} = {};
  response.currentChainTvls = currentChainTvls;

  Object.entries(lastUsdHourlyRecord!).map(([chain, chainTvl]) => {
    if(nonChains.includes(chain) && chain !== "tvl"){
      return
    }
    const normalizedChain = chain;
    const displayChainName = getChainDisplayName(chain)
    if(chainCoingeckoIds[displayChainName]){
      chains.push(displayChainName)
    }
    if(chain !== "tvl"){
      currentChainTvls[displayChainName] = chainTvl;
    }
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
        response.chainTvls[displayChainName] = container;
      }
    }
  })
  const singleChain = getChainDisplayName(protocolData.chain)
  if(response.chainTvls[singleChain] === undefined){
    chains.push(singleChain)
    response.chainTvls[singleChain] = {
      tvl: response.tvl,
      tokensInUsd: response.tokensInUsd,
      tokens: response.tokens
    }
  }
  if(protocolData.name==="Set Protocol"){
    delete response.tokensInUsd;
    delete response.tokens;
    delete response.chainTvls.Ethereum.tokensInUsd;
    delete response.chainTvls.Ethereum.tokens;
  }

  return successResponse(response, 10 * 60); // 10 mins cache
};

export default wrap(handler);
