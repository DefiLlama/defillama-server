import { getLatestSwap } from "./dexAggregators/db/getLatestSwap";
import { wrap, IResponse, successResponse, errorResponse } from "./utils/shared";

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  try {
    const tokenA = event.queryStringParameters?.tokenA;
    const tokenB = event.queryStringParameters?.tokenB;
    if (!tokenA || !tokenB) return errorResponse({ message: "Invalid request." });

    const swap = await getLatestSwap(tokenA!, tokenB!);

    if (swap) return successResponse(swap, 10);
    else return successResponse({}, 10);
  } catch (e) {
    console.log(e);
    return errorResponse({ message: "Something went wrong." });
  }
};

export default wrap(handler);
