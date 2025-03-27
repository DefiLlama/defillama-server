import incentives_imports from "../../../utils/imports/incentives_adapters"
import { AdaptorRecordType, AdaptorRecordTypeMapReverse } from "../../db-utils/adaptor-record";

// TODO: needs to be optimized. Currently loads to memory all adaptors
export const importModule = (module: string) => incentives_imports[module].module

// KEYS USED TO MAP ATTRIBUTE -> KEY IN DYNAMO
export const KEYS_TO_STORE = {
    [AdaptorRecordType.tokenIncentives]: AdaptorRecordTypeMapReverse[AdaptorRecordType.tokenIncentives]
}

export { default as imports } from "../../../utils/imports/incentives_adapters"

export { default as config } from "./config";

 