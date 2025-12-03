import { getChainDisplayName } from "./utils/normalizeChain";
import { getR2 } from "./utils/r2";
import { wrap, IResponse, successResponse, errorResponse } from "./utils/shared";

const handler = async (_event: any): Promise<IResponse> => {
  try {
    const chainsRaw = await getR2(`chainAssets2`).then((res) => JSON.parse(res.body!));
    const chains: { [key: string]: any } = { timestamp: chainsRaw.timestamp,  };
    Object.keys(chainsRaw.value).map((chain) => {
      chains[getChainDisplayName(chain, true)] = chainsRaw.value[chain];
    });
    return successResponse(chains, 10 * 60); // 10 min cache
  } catch (e: any) {
    return errorResponse({ message: e.message });
  }
};

export default wrap(handler);