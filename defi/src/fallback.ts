import { IResponse, wrap, errorResponse } from "./utils";

const handler = async (
  _event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const response = errorResponse({
    message: "This endpoint doesn't exist",
  } as any);

  return response;
};

export default wrap(handler);
