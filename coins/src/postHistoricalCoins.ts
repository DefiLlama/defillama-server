require("dotenv").config();
import { successResponse, wrap, IResponse } from "./utils/shared";
import parseRequestBody from "./utils/shared/parseRequestBody";
import { quantisePeriod } from "./utils/timestampUtils";
import { fetchDBData } from "./getBatchHistoricalCoins";

const searchWidth = quantisePeriod("12h");

const handler = async (event: any): Promise<IResponse> => {
  const body = parseRequestBody(event.body);
  const coinsObj: { [coin: string]: number[] } = body.coins;
  const response = await fetchDBData(coinsObj, searchWidth)

  return successResponse({ coins: response, }, 3600);
};

export default wrap(handler);