import { cache20MinResponse, wrap, IResponse } from "./utils/shared";
import { getTotalProtocolUsersData } from "./users/storeUsers";

async function handler(): Promise<IResponse> {
    return cache20MinResponse(await getTotalProtocolUsersData())
}

export default wrap(handler);