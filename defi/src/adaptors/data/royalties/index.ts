import royalties_imports from "../../../utils/imports/fees_adapters"
import { AdaptorRecordTypeMapReverse } from "../../db-utils/adaptor-record";

// TODO: needs to be optimized. Currently loads to memory all adaptors
export const importModule = (module: string) => royalties_imports[module].module

// KEYS USED TO MAP ATTRIBUTE -> KEY IN DYNAMO
export const KEYS_TO_STORE = AdaptorRecordTypeMapReverse

export { default as config } from "./config";

export { default as royalties_imports } from "../../../utils/imports/fees_adapters"

 