import { saveBlacklistPemrit } from "./dexAggregators/db/saveBlacklistPemrit";
import { wrap, IResponse, successResponse, errorResponse } from "./utils/shared";

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  try {
    const body = JSON.parse(event.body!);

    const blacklistedToken = await saveBlacklistPemrit(body);
    return successResponse(blacklistedToken, 10);
  } catch (e) {
    console.log(e);
    return errorResponse({ message: "Something went wrong." });
  }
};

export default wrap(handler);
