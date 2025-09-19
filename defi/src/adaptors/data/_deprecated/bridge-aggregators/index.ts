import dexs_imports from "../../../../utils/imports/bridge-aggregators_adapters"
import { AdaptorRecordType, AdaptorRecordTypeMapReverse } from "../../types"

// TODO: needs to be optimized. Currently loads to memory all adaptors
export const importModule = (module: string) => dexs_imports[module].module

// KEYS USED TO MAP ATTRIBUTE -> KEY IN DYNAMO
export const KEYS_TO_STORE = {
    [AdaptorRecordType.dailyBridgeVolume]: AdaptorRecordTypeMapReverse[AdaptorRecordType.dailyBridgeVolume],
    [AdaptorRecordType.totalBridgeVolume]: AdaptorRecordTypeMapReverse[AdaptorRecordType.totalBridgeVolume]
}

export { default as imports } from "../../../../utils/imports/bridge-aggregators_adapters"

export { default as config } from "./config";
