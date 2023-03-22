import { AdapterType } from "@defillama/dimension-adapters/adapters/types";
import { AdaptorData, IJSON, ProtocolAdaptor } from "./types";
import { KEYS_TO_STORE as dexs_KEYS_TO_STORE, config as dexs_config, dexs_imports } from "./dexs"
import { KEYS_TO_STORE as derivatives_KEYS_TO_STORE, config as derivatives_config, dex_imports as derivatives_imports } from "./derivatives"
import { KEYS_TO_STORE as fees_KEYS_TO_STORE, config as fees_config, rules as fees_DimensionRules, fees_imports } from "./fees"
import { KEYS_TO_STORE as aggregators_KEYS_TO_STORE, config as aggregators_config, aggregators_imports } from "./aggregators"
import { KEYS_TO_STORE as options_KEYS_TO_STORE, config as options_config, options_imports } from "./options"
import { KEYS_TO_STORE as incentives_KEYS_TO_STORE, config as incentives_config, incentives_imports } from "./incentives"
import { KEYS_TO_STORE as protocols_KEYS_TO_STORE, config as protocols_config, protocols_imports } from "./protocols"
import { KEYS_TO_STORE as royalties_KEYS_TO_STORE, config as royalties_config, royalties_imports } from "./royalties"
import generateProtocolAdaptorsList, { IImportsMap } from "./helpers/generateProtocolAdaptorsList"

// With dynamic imports loads less stuff into memory but becomes slower
// w/ dynamic imports 1 dex -> 19sec
// without 1 dex -> 1.6s (all dexs =200 aprox 4s)

const importsMap = {
    dexs_imports,
    derivatives_imports,
    royalties_imports,
    fees_imports,
    aggregators_imports,
    options_imports,
    incentives_imports,
    protocols_imports,
} as IJSON<typeof dexs_imports>

const all = {
    // list: {},
    imports: {}
} as {
    // list: IJSON<IJSON<ProtocolAdaptor>>,
    imports: IJSON<IImportsMap>
}

export const importModule = (adaptorType: AdapterType) => (mod: string) => all.imports[adaptorType][mod].module

export default async (adaptorType: AdapterType): Promise<AdaptorData> => {
    // Adapters can have all dimensions in one adapter or multiple adapters for different dimensions
    // Thats why we create an object with all adapters using the spread operator which only references the objects (they load all of them into memory anyways)
    if (!all.imports[adaptorType])
        all.imports[adaptorType] = {
            ...Object.entries(importsMap).filter(([key]) => ![`${adaptorType}_imports`, 'protocols_imports'].includes(key)).reduce((acc, [, list]) => ({ ...acc, ...list }), {}),
            ...importsMap.protocols_imports,
            ...importsMap[`${adaptorType}_imports`],
        }

    if (adaptorType === AdapterType.DEXS) return {
        default: await generateProtocolAdaptorsList(all.imports[adaptorType], dexs_config, adaptorType),
        KEYS_TO_STORE: dexs_KEYS_TO_STORE,
        importModule: importModule(adaptorType),
        config: dexs_config
    }
    if (adaptorType === AdapterType.FEES) return {
        default: await generateProtocolAdaptorsList(all.imports[adaptorType], fees_config, adaptorType),
        KEYS_TO_STORE: fees_KEYS_TO_STORE,
        importModule: importModule(adaptorType),
        config: fees_config,
        dimensionRules: fees_DimensionRules
    }
    if (adaptorType === AdapterType.AGGREGATORS) return {
        default: await generateProtocolAdaptorsList(all.imports[adaptorType], aggregators_config, adaptorType),
        KEYS_TO_STORE: aggregators_KEYS_TO_STORE,
        importModule: importModule(adaptorType),
        config: aggregators_config
    }
    if (adaptorType === AdapterType.OPTIONS) return {
        default: await generateProtocolAdaptorsList(all.imports[adaptorType], options_config, adaptorType),
        KEYS_TO_STORE: options_KEYS_TO_STORE,
        importModule: importModule(adaptorType),
        config: options_config
    }
    if (adaptorType === AdapterType.INCENTIVES) return {
        default: await generateProtocolAdaptorsList(all.imports[adaptorType], incentives_config, adaptorType),
        KEYS_TO_STORE: incentives_KEYS_TO_STORE,
        importModule: importModule(adaptorType),
        config: incentives_config
    }
    if (adaptorType === AdapterType.PROTOCOLS) return {
        default: await generateProtocolAdaptorsList(all.imports[adaptorType], protocols_config, adaptorType),
        KEYS_TO_STORE: protocols_KEYS_TO_STORE,
        importModule: importModule(adaptorType),
        config: protocols_config
    }
    if (adaptorType === AdapterType.DERIVATIVES) return {
        default: await generateProtocolAdaptorsList(all.imports[adaptorType], derivatives_config, adaptorType),
        KEYS_TO_STORE: derivatives_KEYS_TO_STORE,
        importModule: importModule(adaptorType),
        config: derivatives_config
    }
    if (adaptorType === AdapterType.ROYALTIES) return {
        default: await generateProtocolAdaptorsList(all.imports[adaptorType], derivatives_config, adaptorType),
        KEYS_TO_STORE: royalties_KEYS_TO_STORE,
        importModule: importModule(adaptorType),
        config: royalties_config
    }
    else throw new Error(`Couldn't find data for ${adaptorType} type`)
}

export const DimensionRules = (adaptorType: AdapterType): AdaptorData['dimensionRules'] => {
    if (adaptorType === AdapterType.FEES) return fees_DimensionRules
}