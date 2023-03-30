import { getPermitBlackList } from "./dexAggregators/db/getPermitBlackList";
import { wrap, IResponse, successResponse, errorResponse } from "./utils/shared";

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  try {
    const chain = event.queryStringParameters?.chain;

    if (!chain) return successResponse({}, 10);

    const blacklist = await getPermitBlackList(chain);
    return successResponse(blacklist, 10);
  } catch (e) {
    console.log(e);
    return errorResponse({ message: "Something went wrong." });
  }
};

export default wrap(handler);
