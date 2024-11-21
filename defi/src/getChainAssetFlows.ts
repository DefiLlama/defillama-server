import { fetchFlows } from "../l2/storeToDb";
import { wrap, IResponse, successResponse, errorResponse } from "./utils/shared";
import { quantisePeriod } from "../l2/utils";
import { secondsInDay } from "./utils/date";
import setEnvSecrets from "./utils/shared/setEnvSecrets";

const handler = async (event: any): Promise<IResponse> => {
  try {
    const period = event.pathParameters?.period
      ? quantisePeriod(event.pathParameters.period.toLowerCase())
      : secondsInDay;
    await setEnvSecrets();
    const percs = await fetchFlows(period);
    return successResponse(percs, 10 * 60); // 10 min cache
  } catch (e: any) {
    return errorResponse({ message: e.message });
  }
};

export default wrap(handler);
