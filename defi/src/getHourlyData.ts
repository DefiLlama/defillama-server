import { wrap, IResponse } from "./utils/shared";
import { craftProtocolResponse, wrapResponseOrRedirect } from './getProtocol'

// undocumented and likely to change whenever I want
// data returned will be wrong, requires cleaning
const handler = async (
    event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
    const response = await craftProtocolResponse(event.pathParameters?.protocol, true, true)
    return wrapResponseOrRedirect(response);
};

export default wrap(handler);
