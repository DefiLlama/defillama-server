import { getR2 } from "./utils/r2";
import { wrap, IResponse, successResponse } from "./utils/shared";

const handler = async (_event: any): Promise<IResponse> => {
  const breakdown = await getR2("emissionsBreakdown").then((r) => JSON.parse(r?.body!));
  const result = {
    protocols: Object.values(breakdown),
    emission24h: 0,
    emission7d: 0,
    emission30d: 0
  };
  result.protocols.forEach((protocol: any) => {
    result.emission24h += protocol.emission24h;
    result.emission7d += protocol.emission7d;
    result.emission30d += protocol.emission30d;
  });

  return successResponse(result, 10 * 60); // 10 min cache
};

export default wrap(handler);
