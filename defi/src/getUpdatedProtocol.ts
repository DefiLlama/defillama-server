import { successResponse, wrap, IResponse } from "./utils/shared";
import { craftProtocolResponse } from './getProtocol'

const handler = async (
    event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
    const response = await craftProtocolResponse(event.pathParameters?.protocol, true)
    return successResponse(response, 10 * 60); // 10 mins cache
};

export default wrap(handler);
