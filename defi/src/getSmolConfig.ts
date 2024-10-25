import { successResponse, wrap, IResponse, errorResponse } from "./utils/shared";
import protocols from "./protocols/data";
import parentProtocols from "./protocols/parentProtocols";
import sluggify from "./utils/sluggify";

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const protocolName = event.pathParameters?.protocol?.toLowerCase();
  const findFn = (prot: any) => sluggify(prot) === protocolName
  let protocolData: any = protocols.find(findFn);
  if (!protocolData) protocolData = parentProtocols.find(findFn);
  if (protocolData === undefined) {
    return errorResponse({
      message: "Protocol is not in our database",
    });
  }

  return successResponse(protocolData, 10 * 60); // 10 mins cache
};

export default wrap(handler);