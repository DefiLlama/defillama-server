import { getR2 } from "./utils/r2";
import { wrap, IResponse, successResponse } from "./utils/shared";

const handler = async (_event: any): Promise<IResponse> => {
  const allProtocols = await getR2(`emissionsProtocolsList`).then((res) =>
    JSON.parse(res.body!),
  );
  return successResponse(allProtocols, 6 * 60 * 60); // 6 hour cache
};

export default wrap(handler);
