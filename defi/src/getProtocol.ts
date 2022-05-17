import { successResponse, wrap, IResponse, errorResponse } from "./utils/shared";
import { getHistoricalValues } from "./utils/shared/dynamodb";
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
import { nonChains, getChainDisplayName, transformNewChainName, addToChains } from "./utils/normalizeChain";
import { importAdapter } from "./utils/imports/importAdapter";
import { storeDataset, buildRedirect } from "./utils/s3";

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

export async function craftProtocolResponse(rawProtocolName:string|undefined, useNewChainNames: boolean, useHourlyData: boolean){
  const protocolName = rawProtocolName?.toLowerCase();
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
    getHistoricalValues((useHourlyData?hourlyTvl:dailyTvl)(protocolData.id)),
    getHistoricalValues((useHourlyData?hourlyUsdTokensTvl:dailyUsdTokensTvl)(protocolData.id)),
    getHistoricalValues((useHourlyData?hourlyTokensTvl:dailyTokensTvl)(protocolData.id)),
    importAdapter(protocolData)
  ]);
  if(!useHourlyData){
    replaceLast(historicalUsdTvl, lastUsdHourlyRecord)
    replaceLast(historicalUsdTokenTvl, lastUsdTokenHourlyRecord)
    replaceLast(historicalTokenTvl, lastTokenHourlyRecord)
  }
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
    const displayChainName = getChainDisplayName(chain, useNewChainNames)
    addToChains(chains, displayChainName);
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
  const singleChain = transformNewChainName(protocolData.chain)
  if(response.chainTvls[singleChain] === undefined && response.chains.length === 0){
    chains.push(singleChain)
    response.chainTvls[singleChain] = {
      tvl: response.tvl,
      tokensInUsd: response.tokensInUsd,
      tokens: response.tokens
    }
  }
  if(response.chainTvls[singleChain] !== undefined && response.chainTvls[singleChain].tvl.length < response.tvl.length) {
    const singleChainTvls = response.chainTvls[singleChain].tvl;
    const first = singleChainTvls[0].date;
    response.chainTvls[singleChain].tvl = response.tvl.filter((t:any)=>t.date < first).concat(singleChainTvls)
  }

  return response
}

export async function wrapResponseOrRedirect(response: any){
  const jsonData = JSON.stringify(response)
  const dataLength = jsonData.length
  if(dataLength >= 5.8e6){
    const filename = `protocol-${response.name}.json`;
    await storeDataset(filename, jsonData, "application/json")

    return buildRedirect(filename);
  } else {
    return successResponse(response, 10 * 60); // 10 mins cache
  }
}

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const response = await craftProtocolResponse(event.pathParameters?.protocol, false, false)

  return wrapResponseOrRedirect(response);
};

export default wrap(handler);
