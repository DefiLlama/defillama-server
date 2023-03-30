import { getHistory } from "./dexAggregators/db/getHistory";
import { wrap, IResponse, successResponse, errorResponse } from "./utils/shared";

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  try {
    const userId = event.queryStringParameters?.userId;
    const chain = event.queryStringParameters?.chain;

    if (!userId || !chain) return successResponse({}, 10);

    const history = await getHistory(userId, chain);
    return successResponse(history, 10);
  } catch (e) {
    console.log(e);
    return errorResponse({ message: "Something went wrong." });
  }
};

export default wrap(handler);
