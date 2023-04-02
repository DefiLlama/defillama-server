import fees_imports from "../../../utils/imports/fees_adapters"
import { AdaptorRecordType, AdaptorRecordTypeMapReverse } from "../../db-utils/adaptor-record";

// TODO: needs to be optimized. Currently loads to memory all adaptors
export const importModule = (module: string) => fees_imports[module].module

// KEYS USED TO MAP ATTRIBUTE -> KEY IN DYNAMO
export const KEYS_TO_STORE = {
    [AdaptorRecordType.dailyFees]: AdaptorRecordTypeMapReverse[AdaptorRecordType.dailyFees],
    [AdaptorRecordType.totalFees]: AdaptorRecordTypeMapReverse[AdaptorRecordType.totalFees],
    [AdaptorRecordType.totalRevenue]: AdaptorRecordTypeMapReverse[AdaptorRecordType.totalRevenue],
    [AdaptorRecordType.dailyRevenue]: AdaptorRecordTypeMapReverse[AdaptorRecordType.dailyRevenue],
    [AdaptorRecordType.dailyFees]: AdaptorRecordTypeMapReverse[AdaptorRecordType.dailyFees],
    [AdaptorRecordType.dailyRevenue]: AdaptorRecordTypeMapReverse[AdaptorRecordType.dailyRevenue],
    [AdaptorRecordType.dailyUserFees]: AdaptorRecordTypeMapReverse[AdaptorRecordType.dailyUserFees],
    [AdaptorRecordType.dailySupplySideRevenue]: AdaptorRecordTypeMapReverse[AdaptorRecordType.dailySupplySideRevenue],
    [AdaptorRecordType.dailyProtocolRevenue]: AdaptorRecordTypeMapReverse[AdaptorRecordType.dailyProtocolRevenue],
    [AdaptorRecordType.dailyHoldersRevenue]: AdaptorRecordTypeMapReverse[AdaptorRecordType.dailyHoldersRevenue],
    [AdaptorRecordType.dailyCreatorRevenue]: AdaptorRecordTypeMapReverse[AdaptorRecordType.dailyCreatorRevenue],
    [AdaptorRecordType.totalFees]: AdaptorRecordTypeMapReverse[AdaptorRecordType.totalFees],
    [AdaptorRecordType.totalRevenue]: AdaptorRecordTypeMapReverse[AdaptorRecordType.totalRevenue],
    [AdaptorRecordType.totalUserFees]: AdaptorRecordTypeMapReverse[AdaptorRecordType.totalUserFees],
    [AdaptorRecordType.totalSupplySideRevenue]: AdaptorRecordTypeMapReverse[AdaptorRecordType.totalSupplySideRevenue],
    [AdaptorRecordType.totalProtocolRevenue]: AdaptorRecordTypeMapReverse[AdaptorRecordType.totalProtocolRevenue],
    [AdaptorRecordType.totalHoldersRevenue]: AdaptorRecordTypeMapReverse[AdaptorRecordType.totalHoldersRevenue],
    [AdaptorRecordType.totalCreatorRevenue]: AdaptorRecordTypeMapReverse[AdaptorRecordType.totalCreatorRevenue]
}

export { default as config } from "./config";

export { default as rules } from "./rules"

export { default as fees_imports } from "../../../utils/imports/fees_adapters"

 