import { fetchChartData } from "../l2/v2/storeToDb";
import { getChainIdFromDisplayName } from "./utils/normalizeChain";
import { wrap, IResponse, successResponse, errorResponse } from "./utils/shared";
import setEnvSecrets from "./utils/shared/setEnvSecrets";

const handler = async (event: any): Promise<IResponse> => {
  try {
    const chainParam = event.pathParameters?.chain;
    const chain = getChainIdFromDisplayName(chainParam.replace("%20", " "))
    await setEnvSecrets();
    const chains = await fetchChartData(chain);
    return successResponse(chains, 10 * 60); // 10 min cache
  } catch (e: any) {
    return errorResponse({ message: e.message });
  }
};

export default wrap(handler);
