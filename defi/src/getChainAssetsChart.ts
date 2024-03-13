import { wrap, IResponse, successResponse } from "./utils/shared";
import { fetchHistoricalFromDB } from "../l2/storeToDb";

const handler = async (event: any): Promise<IResponse> => {
  const chain = event.pathParameters?.sub?.chain?.toLowerCase();
  const chains = await fetchHistoricalFromDB(chain);
  return successResponse(chains, 10 * 60); // 10 min cache
};

export default wrap(handler);
