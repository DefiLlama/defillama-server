import royalties_imports from "../../../utils/imports/fees_adapters"
import { KEYS_TO_STORE as KEYS_TO_STORE_fees } from "../fees"

// TODO: needs to be optimized. Currently loads to memory all adaptors
export const importModule = (module: string) => royalties_imports[module].module

// KEYS USED TO MAP ATTRIBUTE -> KEY IN DYNAMO
export const KEYS_TO_STORE = KEYS_TO_STORE_fees

export { default as config } from "./config";

export { default as royalties_imports } from "../../../utils/imports/fees_adapters"

