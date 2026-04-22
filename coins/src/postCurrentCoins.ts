import { successResponse, wrap, IResponse } from "./utils/shared";
import parseRequestBody from "./utils/shared/parseRequestBody";
import { getCurrentCoins } from "./getCurrentCoins";

const handler = async (event: any): Promise<IResponse> => {
  const body = parseRequestBody(event.body);
  const requestedCoins: string[] = body.coins;

  const response = await getCurrentCoins({ requestedCoins });


  const date = new Date();
  const minutes = date.getMinutes();
  date.setMinutes(minutes + 5 - (minutes % 5));
  date.setSeconds(20);
  return successResponse({ coins: response, },
    undefined,
    { Expires: date.toUTCString(), },
  );
};

export default wrap(handler);