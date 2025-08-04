import { successResponse, wrap, IResponse, errorResponse } from "./utils/shared";
import { chainCoingeckoIds, transformNewChainName } from "./utils/normalizeChain";
import fetch from "node-fetch";

export async function getChainDefaultChartData(chain: string, chartBody?: any) {
  chain = chain.toLowerCase();
  const global = chain === "";
  const properChaiName = Object.keys(chainCoingeckoIds).find((k) => k.toLowerCase() === chain);
  if (properChaiName === undefined && !global) {
    return errorResponse({
      message: "There is no chain with that name " + chain,
    });
  }

  if (!chartBody) {
    const chart = await fetch(`https://api.llama.fi/lite/charts${global ? "" : "/" + transformNewChainName(properChaiName!)}`);
    chartBody = await chart.json();
  }

  const tvl = Object.fromEntries(chartBody.tvl);

  chartBody.doublecounted?.forEach(([date, value]: [string, number]) => {
    if (tvl[date]) {
      tvl[date] = tvl[date] - value;
    }
  });

  chartBody.liquidstaking?.forEach(([date, value]: [string, number]) => {
    if (tvl[date]) {
      tvl[date] = tvl[date] - value;
    }
  });

  chartBody.dcAndLsOverlap?.forEach(([date, value]: [string, number]) => {
    if (tvl[date]) {
      tvl[date] = tvl[date] + value;
    }
  });

  return Object.entries(tvl).map((v: any) => ({
    date: Number(v[0]),
    tvl: Number(v[1]),
  }))
}

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  const chain = decodeURI(event.pathParameters?.chain?.toLowerCase() ?? "");
  try {
    const data = await getChainDefaultChartData(chain)
    return successResponse(data, 10 * 60);
  } catch (e) {
    return errorResponse({ message: "There is no chain with that name: " + chain })
  }
};

export default wrap(handler);
