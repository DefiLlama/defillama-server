import { successResponse, wrap, IResponse, errorResponse } from "./utils/shared";
import { chainCoingeckoIds, transformNewChainName } from "./utils/normalizeChain";
import fetch from "node-fetch";

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  const chain = decodeURI(event.pathParameters?.chain?.toLowerCase() ?? "");
  const global = chain === "";
  const properChaiName = Object.keys(chainCoingeckoIds).find((k) => k.toLowerCase() === chain);
  if (properChaiName === undefined && !global) {
    return errorResponse({
      message: "There is no chain with that name",
    });
  }
  const chart = await fetch(
    `https://api.llama.fi/lite/charts${global ? "" : "/" + transformNewChainName(properChaiName!)}`
  );
  const chartBody = await chart.json();

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

  return successResponse(
    Object.entries(tvl).map((v: any) => ({
      date: Number(v[0]),
      tvl: Number(v[1]),
    })),
    10 * 60
  ); // 10 mins cache
};

export default wrap(handler);
