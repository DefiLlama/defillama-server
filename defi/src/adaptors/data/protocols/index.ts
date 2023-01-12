import generateProtocolAdaptorsList from "../helpers/generateProtocolAdaptorsList";
import protocols_imports from "../../../utils/imports/protocols_adapters"
import config from "./config";
import { AdaptorRecordType, AdaptorRecordTypeMapReverse } from "../../db-utils/adaptor-record";

// TODO: needs to be optimized. Currently loads to memory all adaptors
export const importModule = (module: string) => protocols_imports[module].module

// KEYS USED TO MAP ATTRIBUTE -> KEY IN DYNAMO
export const KEYS_TO_STORE = AdaptorRecordTypeMapReverse

export { default as config } from "./config";

export default generateProtocolAdaptorsList(protocols_imports, config, "prots")