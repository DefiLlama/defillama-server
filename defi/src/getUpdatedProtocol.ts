import { wrap, IResponse } from "./utils/shared";
import { craftProtocolResponse, wrapResponseOrRedirect } from "./getProtocol";

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const response = await craftProtocolResponse(
    event.pathParameters?.protocol,
    true,
    false
  );

  const data = wrapResponseOrRedirect(response);

  if (event.pathParameters?.protocol === "dodo") {
    console.log(data);
  }

  return data;
};

export default wrap(handler);
