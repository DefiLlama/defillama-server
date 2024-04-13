import { fetchHistoricalFlows } from "../l2/storeToDb";
import { wrap, IResponse, successResponse, errorResponse } from "./utils/shared";
import { quantisePeriod } from "../l2/utils";
import { secondsInDay } from "./utils/date";

const handler = async (event: any): Promise<IResponse> => {
  try {
    const period = event.pathParameters?.period
      ? quantisePeriod(event.pathParameters.period.toLowerCase())
      : secondsInDay;
    const chain = event.pathParameters?.chain;
    if (!chain) throw new Error(`chain path param required`);
    const flows = await fetchHistoricalFlows(period, chain);
    return successResponse(flows, 10 * 60); // 10 min cache
  } catch (e: any) {
    return errorResponse({ message: e.message });
  }
};

export default wrap(handler);
