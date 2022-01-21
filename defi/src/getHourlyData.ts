import { successResponse, wrap, IResponse } from "./utils/shared";
import { craftProtocolResponse } from './getProtocol'

// undocumented and likely to change whenever I want
// data returned will be wrong, requires cleaning
const handler = async (
    event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
    const response = await craftProtocolResponse(event.pathParameters?.protocol, true, true)
    return successResponse(response, 10 * 60); // 10 mins cache
};

export default wrap(handler);
