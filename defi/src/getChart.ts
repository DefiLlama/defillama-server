import { successResponse, wrap, IResponse, errorResponse } from "./utils/shared";
import { chainCoingeckoIds, transformNewChainName } from "./utils/normalizeChain";
import fetch from "node-fetch";

export async function getChainChartData(chain: string) {
  chain = chain.toLowerCase()
  const global = chain === "";
  const properChaiName = Object.keys(chainCoingeckoIds).find(k => k.toLowerCase() === chain)
  if (properChaiName === undefined && !global)
    throw new Error("There is no chain with that name")

  const chart = await fetch(`https://api.llama.fi/lite/charts${global ? "" : "/" + transformNewChainName(properChaiName!)}`)
  const chartBody = await chart.json()
  return chartBody.tvl.map((v: any) => ({
    "date": String(v[0]),
    "totalLiquidityUSD": Number(v[1])
  }))
}

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const chain = decodeURI(event.pathParameters?.chain?.toLowerCase() ?? "");
  try {
    const data = await getChainChartData(chain)
    return successResponse(data, 10 * 60);
  } catch (e) {
    return errorResponse({ message: "There is no chain with that name" })
  }
};

export default wrap(handler);
