import { getSwapTotalVolume } from "./dexAggregators/db/getSwapTotalVolume";
import { wrap, IResponse, successResponse, errorResponse } from "./utils/shared";

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  try {
    const timestamp = event.queryStringParameters?.timestamp;

    if (!timestamp) return successResponse({}, 10);

    const volume = await getSwapTotalVolume(timestamp);
    return successResponse({ volume }, 10);
  } catch (e) {
    console.log(e);
    return errorResponse({ message: "Something went wrong." });
  }
};

export default wrap(handler);
