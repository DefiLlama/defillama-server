import { wrap, IResponse } from "./utils/shared";
import { craftProtocolResponse, wrapResponseOrRedirect } from "./getProtocol";

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  const response = await craftProtocolResponse(event.pathParameters?.protocol, true, false, false, true);

  return wrapResponseOrRedirect(response);
};

export default wrap(handler);
