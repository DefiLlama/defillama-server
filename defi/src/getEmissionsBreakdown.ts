import { getR2 } from "./utils/r2";
import { wrap, IResponse, successResponse } from "./utils/shared";

const handler = async (_event: any): Promise<IResponse> => {
  const breakdowm = await getR2("emissionsBreakdown").then((r) => JSON.parse(r?.body!));
  return successResponse(breakdowm, 10 * 60); // 10 min cache
};

export default wrap(handler);
