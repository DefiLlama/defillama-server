import { AdapterType } from "@defillama/adaptors/adapters/types";
import { AdaptorData } from "./types";
import volumes, { KEYS_TO_STORE as volumes_KEYS_TO_STORE, importModule as volumes_importModule } from "./volumes"
import fees, { KEYS_TO_STORE as fees_KEYS_TO_STORE, importModule as fees_importModule } from "./fees"

// It shouldn't import/return both at the same time for perfornace reasons but couldn't make work a dynamic import. needs to be improved:/
export default (adaptorType: AdapterType): AdaptorData => {
    if (adaptorType === AdapterType.VOLUME) return {
        default: volumes,
        KEYS_TO_STORE: volumes_KEYS_TO_STORE,
        importModule: volumes_importModule
    }
    if (adaptorType === AdapterType.FEES) return {
        default: fees,
        KEYS_TO_STORE: fees_KEYS_TO_STORE,
        importModule: fees_importModule,
    }
    else throw new Error(`Couldn't find data for ${adaptorType} type`)
}