import generateProtocolAdaptorsList from "../helpers/generateProtocolAdaptorsList";
import fees_imports from "../../../utils/imports/adapters_fees"
import config from "./config";
import { AdaptorRecordType } from "../../db-utils/adaptor-record";

// TODO: needs to be optimized. Currently loads to memory all adaptors
export const importModule = (module: string) => fees_imports[module]

// KEYS USED TO MAP ATTRIBUTE -> KEY IN DYNAMO
export const KEYS_TO_STORE = {
    [AdaptorRecordType.totalFeesRecord]: "totalFees",
    [AdaptorRecordType.dailyFeesRecord]: "dailyFees",
    [AdaptorRecordType.totalRevenueRecord]: "totalRevenue",
    [AdaptorRecordType.dailyRevenueRecord]: "dailyRevenue"
}

export default generateProtocolAdaptorsList(fees_imports, config)