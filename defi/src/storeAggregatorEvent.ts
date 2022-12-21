import { saveEvent } from "./dexAggregators/db/saveEvent";
import { wrap, IResponse, errorResponse, successResponse } from "./utils/shared";

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  const body = JSON.parse(event.body!);

  const swapEvent = await saveEvent(body);
  return successResponse(swapEvent, 10);
};

export default wrap(handler);
