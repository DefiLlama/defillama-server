import { getR2 } from "./utils/r2";
import { wrap, IResponse, successResponse } from "./utils/shared";

const handler = async (_event: any): Promise<IResponse> => {
  const chains = await getR2(`chainAssets`).then((res) => JSON.parse(res.body!));
  return successResponse(chains, 10 * 60); // 10 min cache
};

export default wrap(handler);
// handler({}); // ts-node defi/src/getChainAssets.ts
