import { successResponse, wrap, IResponse, errorResponse } from "./utils/shared";
import { chainCoingeckoIds, transformNewChainName } from "./utils/normalizeChain";
import fetch from "node-fetch";

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const chain = decodeURI(event.pathParameters?.chain?.toLowerCase() ?? "");
  const global = chain === "";
  const properChaiName = Object.keys(chainCoingeckoIds).find(k=>k.toLowerCase() === chain)
  if(properChaiName === undefined && !global){
    return errorResponse({
      message: "There is no chain with that name"
    })
  }
  const chart = await fetch(`https://api.llama.fi/lite/charts${global?"":"/"+transformNewChainName(properChaiName!)}`)
  const chartBody = await chart.json()
  return successResponse(chartBody.tvl.map((v:any)=>({
    "date":String(v[0]),
    "totalLiquidityUSD": Number(v[1])
  })), 10 * 60); // 10 mins cache
};

export default wrap(handler);
