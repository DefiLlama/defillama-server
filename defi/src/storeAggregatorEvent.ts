import { saveEvent } from "./dexAggregators/db/saveEvent";
import { wrap, IResponse, successResponse, errorResponse } from "./utils/shared";

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  try {
    const body = JSON.parse(event.body!);

    const swapEvent = await saveEvent(body);
    return successResponse(swapEvent, 10);
  } catch (e) {
    console.log(e);
    return errorResponse({ message: "Something went wrong." });
  }
};

export default wrap(handler);
