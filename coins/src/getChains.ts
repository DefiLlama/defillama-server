import chainToCoingeckoId from "../../common/chainToCoingeckoId";
import { successResponse, wrap, IResponse } from "./utils/shared";

const handler = async (): Promise<IResponse> => {
    return successResponse(Object.keys(chainToCoingeckoId), 3600);
};

export default wrap(handler);
