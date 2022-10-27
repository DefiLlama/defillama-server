import { AdapterType } from "@defillama/adaptors/adapters/types";
import { AdaptorData } from "./types";
import volumes, { KEYS_TO_STORE as volumes_KEYS_TO_STORE, importModule as volumes_importModule } from "./volumes"
import fees, { KEYS_TO_STORE as fees_KEYS_TO_STORE, importModule as fees_importModule } from "./fees"
import aggregators, { KEYS_TO_STORE as aggregators_KEYS_TO_STORE, importModule as aggregators_importModule } from "./aggregators"
import options, { KEYS_TO_STORE as options_KEYS_TO_STORE, importModule as options_importModule } from "./options"
import incentives, { KEYS_TO_STORE as incentives_KEYS_TO_STORE, importModule as incentives_importModule } from "./incentives"

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
    if (adaptorType === AdapterType.AGGREGATORS) return {
        default: aggregators,
        KEYS_TO_STORE: aggregators_KEYS_TO_STORE,
        importModule: aggregators_importModule,
    }
    if (adaptorType === AdapterType.OPTIONS) return {
        default: options,
        KEYS_TO_STORE: options_KEYS_TO_STORE,
        importModule: options_importModule,
    }
    if (adaptorType === AdapterType.INCENTIVES) return {
        default: incentives,
        KEYS_TO_STORE: incentives_KEYS_TO_STORE,
        importModule: incentives_importModule,
    }
    else throw new Error(`Couldn't find data for ${adaptorType} type`)
}