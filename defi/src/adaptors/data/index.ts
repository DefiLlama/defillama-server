import { AdapterType } from "@defillama/dimension-adapters/adapters/types";
import { AdaptorData, IJSON, ProtocolAdaptor } from "./types";
import dexs, { KEYS_TO_STORE as dexs_KEYS_TO_STORE, importModule as dexs_importModule, config as dexs_config } from "./dexs"
import derivatives, { KEYS_TO_STORE as derivatives_KEYS_TO_STORE, importModule as derivatives_importModule, config as derivatives_config } from "./derivatives"
import fees, { KEYS_TO_STORE as fees_KEYS_TO_STORE, importModule as fees_importModule, config as fees_config, rules as fees_DimensionRules } from "./fees"
import aggregators, { KEYS_TO_STORE as aggregators_KEYS_TO_STORE, importModule as aggregators_importModule, config as aggregators_config } from "./aggregators"
import options, { KEYS_TO_STORE as options_KEYS_TO_STORE, importModule as options_importModule, config as options_config } from "./options"
import incentives, { KEYS_TO_STORE as incentives_KEYS_TO_STORE, importModule as incentives_importModule, config as incentives_config } from "./incentives"
import protocols, { KEYS_TO_STORE as protocols_KEYS_TO_STORE, importModule as protocols_importModule, config as protocols_config } from "./protocols"

// With dynamic imports loads less stuff into memory but becomes slower
// w/ dynamic imports 1 dex -> 19sec
// without 1 dex -> 1.6s (all dexs =200 aprox 4s)

// order here matters
const map = {
    derivatives,
    incentives,
    aggregators,
    options,
    fees,
    dexs,
    protocols,
}

const listToMap = <T>(list: T[], key: string) => list.reduce((acc, curr) => {
    console.log("Processing", curr)
    const keyMap = (curr as IJSON<string>)[key] as string
    return { ...acc, [keyMap]: curr }
}, {} as IJSON<T>)

export default (adaptorType: AdapterType): AdaptorData => {
    // Adapters can have all dimensions in one adapter or multiple adapters for different dimensions
    // Thats why we create an object with all adapters using the spread operator which only references the objects (they load all of them into memory anyways)
    const all = {
        ...listToMap(Object.entries(map).filter(([key]) => ![adaptorType, 'protocols'].includes(key)).reduce((acc, [, list]) => (acc.concat(list)), [] as ProtocolAdaptor[]), 'module'),
        ...listToMap(map.protocols, 'module'), //TODO: move protocols adapters to dexs folder
        ...listToMap(map[adaptorType], 'module') //important to be the last one
    } as IJSON<ProtocolAdaptor>
    const def = Object.values(all)
    if (adaptorType === AdapterType.DEXS) return {
        default: def,
        KEYS_TO_STORE: dexs_KEYS_TO_STORE,
        importModule: dexs_importModule,
        config: dexs_config
    }
    if (adaptorType === AdapterType.FEES) return {
        default: def,
        KEYS_TO_STORE: fees_KEYS_TO_STORE,
        importModule: fees_importModule,
        config: fees_config,
        dimensionRules: fees_DimensionRules
    }
    if (adaptorType === AdapterType.AGGREGATORS) return {
        default: def,
        KEYS_TO_STORE: aggregators_KEYS_TO_STORE,
        importModule: aggregators_importModule,
        config: aggregators_config
    }
    if (adaptorType === AdapterType.OPTIONS) return {
        default: def,
        KEYS_TO_STORE: options_KEYS_TO_STORE,
        importModule: options_importModule,
        config: options_config
    }
    if (adaptorType === AdapterType.INCENTIVES) return {
        default: def,
        KEYS_TO_STORE: incentives_KEYS_TO_STORE,
        importModule: incentives_importModule,
        config: incentives_config
    }
    if (adaptorType === AdapterType.PROTOCOLS) return {
        default: def,
        KEYS_TO_STORE: protocols_KEYS_TO_STORE,
        importModule: protocols_importModule,
        config: protocols_config
    }
    if (adaptorType === AdapterType.DERIVATIVES) return {
        default: def,
        KEYS_TO_STORE: derivatives_KEYS_TO_STORE,
        importModule: derivatives_importModule,
        config: derivatives_config
    }
    else throw new Error(`Couldn't find data for ${adaptorType} type`)
}

export const DimensionRules = (adaptorType: AdapterType): AdaptorData['dimensionRules'] => {
    if (adaptorType === AdapterType.FEES) return fees_DimensionRules
}