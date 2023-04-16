import { cache20MinResponse, wrap, IResponse } from "./utils/shared";
import { getProtocolUsers } from "./users/storeUsers";

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
    const protocolId = event.pathParameters?.protocolId?.toLowerCase();
    const records = await getProtocolUsers(protocolId ?? "none")
    return cache20MinResponse(records)
}

export default wrap(handler);