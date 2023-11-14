import { getR2 } from "./utils/r2";
import { wrap, IResponse, successResponse, errorResponse } from "./utils/shared";

const handler = async (_event: any): Promise<IResponse> => {
  const data = await getR2(`emissionsIndex`);
  if (data && data.body) return successResponse(JSON.parse(data.body).data, 3600);
  else return errorResponse({ message: "could not get/parse emissionsIndex" });
};

export default wrap(handler);
//handler({}); // ts-node defi/src/getEmissions.ts
