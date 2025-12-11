import { wrap, IResponse, successResponse, errorResponse } from "./utils/shared";
import { fetchCurrentChainAssets } from "../l2/v2/storeToDb";

const handler = async (_event: any): Promise<IResponse> => {
  try {
    const chains = await fetchCurrentChainAssets();
    return successResponse(chains, 10 * 60); // 10 min cache
  } catch (e: any) {
    return errorResponse({ message: e.message });
  }
};

export default wrap(handler);
// handler({}); // ts-node defi/src/getChainAssets.ts
