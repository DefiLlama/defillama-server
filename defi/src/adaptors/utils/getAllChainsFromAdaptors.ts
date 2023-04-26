import { DISABLED_ADAPTER_KEY, Adapter, BaseAdapter, AdapterType } from "@defillama/dimension-adapters/adapters/types";
import { CHAIN } from "@defillama/dimension-adapters/helpers/chains";
import { getChainDisplayName, normalizedChainReplacements } from "../../utils/normalizeChain";
import { getMethodologyByType as getDefaultMethodologyByCategory, getParentProtocolMethodology } from "../data/helpers/methodology";
import { IJSON, ProtocolAdaptor } from "../data/types";

export const getStringArrUnique = (arr: string[]) => {
    return arr.filter((value, index, self) => {
        return self.indexOf(value) === index;
    })
}

const getAllChainsFromAdaptors = (dexs2Filter: string[], moduleAdapter: Adapter, filter: boolean = true) => {
    return getStringArrUnique(dexs2Filter.reduce((acc, adapterName) => {
        const adaptor = moduleAdapter
        if (!adaptor) return acc
        if ("adapter" in adaptor) {
            const chains = Object.keys(adaptor.adapter).filter(c => !filter || c !== DISABLED_ADAPTER_KEY)
            for (const chain of chains)
                if (!acc.includes(chain)) acc.push(chain)
        } else if ("breakdown" in adaptor) {
            for (const brokenDownDex of Object.values(adaptor.breakdown)) {
                const chains = Object.keys(brokenDownDex).filter(c => !filter || c !== DISABLED_ADAPTER_KEY)
                for (const chain of chains)
                    if (!acc.includes(chain)) acc.push(chain)
            }
        } else console.error("Invalid adapter", adapterName, moduleAdapter)
        return acc
    }, [] as string[]))
}

export const getChainsFromBaseAdapter = (moduleAdapter: BaseAdapter) => {
    return Object.keys(moduleAdapter).filter(c => c !== DISABLED_ADAPTER_KEY)
}

export const getAllProtocolsFromAdaptor = (adaptorModule: string, adaptor: Adapter) => {
    if (!adaptor) return []
    if ("adapter" in adaptor) {
        return [adaptorModule]
    } else if ("breakdown" in adaptor) {
        return Object.entries(adaptor.breakdown).reduce((acc, [key, adapter]) => {
            if (!Object.keys(adapter).some(c => c === DISABLED_ADAPTER_KEY))
                acc.push(key)
            return acc
        }, [] as string[])
    } else
        throw new Error(`Invalid adapter ${adaptorModule}`)
}

export const isDisabled = (adaptor: Adapter) => {
    if ("adapter" in adaptor) {
        return Object.keys(adaptor.adapter).includes(DISABLED_ADAPTER_KEY)
    } else if ("breakdown" in adaptor) {
        for (const brokenDownDex of Object.values(adaptor.breakdown)) {
            if (!Object.keys(brokenDownDex).includes(DISABLED_ADAPTER_KEY))
                return false
        }
        return true
    }
    else
        throw new Error(`Invalid adapter`)
}

export const getMethodologyData = (displayName: string, adaptorKey: string, moduleAdapter: Adapter, category: string): ProtocolAdaptor['methodology'] | undefined => {
    if (
        'adapter' in moduleAdapter
        || ('breakdown' in moduleAdapter && Object.keys(moduleAdapter.breakdown).length === 1)
    ) {
        const adapter = 'adapter' in moduleAdapter ? moduleAdapter.adapter : Object.values(moduleAdapter.breakdown)[0]
        const methodology = Object.values(adapter)[0].meta?.methodology
        if (!methodology) return { ...(getDefaultMethodologyByCategory(category) ?? {}) }
        if (typeof methodology === 'string') return methodology
        return {
            ...(getDefaultMethodologyByCategory(category) ?? {}),
            ...methodology
        }
    }
    else {
        return getParentProtocolMethodology(displayName, getAllProtocolsFromAdaptor(adaptorKey, moduleAdapter))
    }
}

export const getMethodologyDataByBaseAdapter = (adapter: BaseAdapter, type?: string, category?: string): ProtocolAdaptor['methodology'] | undefined => {
    const methodology = Object.values(adapter)[0].meta?.methodology
    if (!methodology && type === AdapterType.FEES) return { ...(getDefaultMethodologyByCategory(category ?? '') ?? {}) }
    if (typeof methodology === 'string') return methodology
    return {
        ...(getDefaultMethodologyByCategory(category ?? '') ?? {}),
        ...methodology
    }
}

export const formatChain = (chain: string) => {
    if (!chain) return chain
    let c = chain.toLowerCase()
    return getChainDisplayName(c, true)
}

export const normalizeDimensionChainsMap = {
    ...normalizedChainReplacements,
    'avalanche': CHAIN.AVAX,
    'terra classic': CHAIN.TERRA,
    'terra-classic': CHAIN.TERRA,
    'karura': CHAIN.KARURA,
    'zksync era': CHAIN.ERA,
    'zksync lite': CHAIN.ZKSYNC,
    'multiversx': CHAIN.ELROND,
    'okxchain': CHAIN.OKEXCHAIN,
    'gnosis': CHAIN.XDAI,
    'godwokenv1': CHAIN.GODWOKEN_V1,
    'milkomeda c1': CHAIN.MILKOMEDA,
    'oraichain': CHAIN.ORAI,
    'cosmoshub': CHAIN.COSMOS,
    'rangers': CHAIN.RPG,
    'polygon zkevm': CHAIN.POLYGON_ZKEVM,
    'sxnetwork': CHAIN.SX,
    'ontologyevm': CHAIN.ONTOLOGY_EVM,
    'wanchain': CHAIN.WAN,
    'oasys': CHAIN.OAS
} as IJSON<CHAIN>

export const formatChainKey = (chain: string) => {
    if (normalizeDimensionChainsMap[chain.toLowerCase()])
        return normalizeDimensionChainsMap[chain.toLowerCase()]
    return chain
}

export default getAllChainsFromAdaptors