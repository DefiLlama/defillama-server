import { successResponse, wrap, IResponse } from "./utils/shared";
import protocols from "./protocols/data";
import {chainCoingeckoIds} from "./utils/normalizeChain";

const handler = async (
  _event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  return successResponse({
    protocols,
    chainCoingeckoIds
  }, 30*60);
};

export default wrap(handler);
