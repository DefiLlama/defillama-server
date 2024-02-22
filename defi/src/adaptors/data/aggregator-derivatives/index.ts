import aggregators_derivatives_imports from "../../../utils/imports/aggregator-derivatives_adapters"
import { AdaptorRecordType, AdaptorRecordTypeMapReverse } from "../../db-utils/adaptor-record";

export const importModule = (module: string) => aggregators_derivatives_imports[module].module

export const KEYS_TO_STORE = {
  [AdaptorRecordType.dailyVolume]: AdaptorRecordTypeMapReverse[AdaptorRecordType.dailyVolume],
  [AdaptorRecordType.totalVolume]: AdaptorRecordTypeMapReverse[AdaptorRecordType.totalVolume]
}

export { default as config } from "./config";

export { default as imports } from "../../../utils/imports/aggregator-derivatives_adapters"
