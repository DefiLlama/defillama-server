import generateProtocolAdaptorsList from "../helpers/generateProtocolAdaptorsList";
import fees_imports from "../../../utils/imports/fees_adapters"
import config from "./config";
import { AdaptorRecordType } from "../../db-utils/adaptor-record";

// TODO: needs to be optimized. Currently loads to memory all adaptors
export const importModule = (module: string) => fees_imports[module].module

// KEYS USED TO MAP ATTRIBUTE -> KEY IN DYNAMO
export const KEYS_TO_STORE = {
    [AdaptorRecordType.dailyFees]: "dailyFees",
    [AdaptorRecordType.totalFees]: "totalFees",
    [AdaptorRecordType.totalRevenue]: "totalRevenue",
    [AdaptorRecordType.dailyRevenue]: "dailyRevenue"
}

export { default as config } from "./config";

export default generateProtocolAdaptorsList(fees_imports, config)