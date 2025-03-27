import { wrap, IResponse, successResponse, errorResponse } from "./utils/shared";
import { fetchHistoricalFromDB } from "../l2/storeToDb";
import setEnvSecrets from "./utils/shared/setEnvSecrets";

const handler = async (event: any): Promise<IResponse> => {
  try {
    const chain = event.pathParameters?.chain;
    await setEnvSecrets()
    const chains = await fetchHistoricalFromDB(chain);
    return successResponse(chains, 10 * 60); // 10 min cache
  } catch (e: any) {
    return errorResponse({ message: e.message });
  }
};

export default wrap(handler);
