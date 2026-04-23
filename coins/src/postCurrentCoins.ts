import { successResponse, wrap, IResponse } from "./utils/shared";
import parseRequestBody from "./utils/shared/parseRequestBody";
import { getCurrentCoins } from "./getCurrentCoins";

const handler = async (event: any): Promise<IResponse> => {
  const body = parseRequestBody(event.body);
  const requestedCoins: string[] = body.coins;

  const response = await getCurrentCoins({ requestedCoins });

  return successResponse({ coins: response, });
};

export default wrap(handler);