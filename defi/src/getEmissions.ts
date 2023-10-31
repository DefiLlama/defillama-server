import { getR2 } from "./utils/r2";
import { wrap, IResponse, successResponse } from "./utils/shared";

const handler = async (_event: any): Promise<IResponse> => {
  const data = await getR2(`emissionsIndex`);
  return successResponse(data, 10 ** 60);
};

export default wrap(handler);
//handler({}); // ts-node defi/src/getEmissions.ts
