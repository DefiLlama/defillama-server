import { successResponse, wrap, IResponse } from "./utils";

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const protocol = event.pathParameters?.protocol?.toLowerCase();
  const response = {
    protocol,
  };
  return successResponse(response, 10 * 60); // 10 mins cache
};

export default wrap(handler);
