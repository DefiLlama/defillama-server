import { successResponse, wrap, IResponse } from "./utils";
import protocols from "./protocols/data";

const handler = async (
  _event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  return successResponse(protocols);
};

export default wrap(handler);
