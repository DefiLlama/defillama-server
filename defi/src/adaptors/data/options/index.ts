import options_imports from "../../../utils/imports/options_adapters"
import { AdaptorRecordType, AdaptorRecordTypeMapReverse } from "../../db-utils/adaptor-record";

// TODO: needs to be optimized. Currently loads to memory all adaptors
export const importModule = (module: string) => options_imports[module].module

// KEYS USED TO MAP ATTRIBUTE -> KEY IN DYNAMO
export const KEYS_TO_STORE = {
    [AdaptorRecordType.totalPremiumVolume]: AdaptorRecordTypeMapReverse[AdaptorRecordType.totalPremiumVolume],
    [AdaptorRecordType.totalNotionalVolume]: AdaptorRecordTypeMapReverse[AdaptorRecordType.totalNotionalVolume],
    [AdaptorRecordType.dailyPremiumVolume]: AdaptorRecordTypeMapReverse[AdaptorRecordType.dailyPremiumVolume],
    [AdaptorRecordType.dailyNotionalVolume]: AdaptorRecordTypeMapReverse[AdaptorRecordType.dailyNotionalVolume]
}

export { default as config } from "./config";

export { default as options_imports } from "../../../utils/imports/options_adapters"

 