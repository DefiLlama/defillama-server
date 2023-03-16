import generateProtocolAdaptorsList from "../helpers/generateProtocolAdaptorsList";
import options_imports from "../../../utils/imports/options_adapters"
import config from "./config";
import { AdaptorRecordType } from "../../db-utils/adaptor-record";

// TODO: needs to be optimized. Currently loads to memory all adaptors
export const importModule = (module: string) => options_imports[module].module

// KEYS USED TO MAP ATTRIBUTE -> KEY IN DYNAMO
export const KEYS_TO_STORE = {
    [AdaptorRecordType.totalPremiumVolume]: "totalPremiumVolume",
    [AdaptorRecordType.totalNotionalVolume]: "totalNotionalVolume",
    [AdaptorRecordType.dailyPremiumVolume]: "dailyPremiumVolume",
    [AdaptorRecordType.dailyNotionalVolume]: "dailyNotionalVolume"
}

export { default as config } from "./config";

export { default as options_imports } from "../../../utils/imports/options_adapters"

 