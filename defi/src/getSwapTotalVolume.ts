import { getSwapTotalVolume } from "./dexAggregators/db/getSwapTotalVolume";
import { wrap, IResponse, successResponse, errorResponse } from "./utils/shared";

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  try {
    const timestamp = event.queryStringParameters?.timestamp;
    const chain = event.queryStringParameters?.chain;

    if (!timestamp || !chain) return successResponse({}, 10);

    const volume = await getSwapTotalVolume(timestamp, chain);
    return successResponse({ volume }, 10);
  } catch (e) {
    console.log(e);
    return errorResponse({ message: "Something went wrong." });
  }
};

export default wrap(handler);
