import { DISABLED_ADAPTER_KEY, Adapter, BaseAdapter, AdapterType } from "@defillama/dimension-adapters/adapters/types";
import { CHAIN } from "@defillama/dimension-adapters/helpers/chains";
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

export const getChainByProtocolVersion = (moduleAdapterName: string, moduleAdapter: Adapter, chainFilter?: string, filter: boolean = true): IJSON<string[]> => {
    if ("adapter" in moduleAdapter) {
        return {
            [moduleAdapterName]: Object.keys(moduleAdapter.adapter).filter(c => (!filter || c !== DISABLED_ADAPTER_KEY))
        }
    } else if ("breakdown" in moduleAdapter) {
        const chainsAcc = {} as IJSON<string[]>
        for (const [protVersion, brokenDownDex] of Object.entries(moduleAdapter.breakdown)) {
            const chains = Object.keys(brokenDownDex).filter(c => (!filter || c !== DISABLED_ADAPTER_KEY))
            for (const c of chains) {
                const chain = c
                if (chainFilter && chain !== formatChainKey(chainFilter)) continue
                if (chainsAcc[protVersion]) {
                    if (!chainsAcc[protVersion].includes(chain)) chainsAcc[protVersion].push(chain)
                }
                else chainsAcc[protVersion] = [chain]
            }
        }
        return chainsAcc
    } else throw new Error("Invalid adapter")
}

/* export const isDisabledByProtocolVersion = (moduleAdapterName: string, moduleAdapter: Adapter, chainFilter?: string, protV?: string) => {
    const chs = getChainByProtocolVersion(moduleAdapterName, moduleAdapter, chainFilter, false)
    if (!chs || !protV) return false
    return chs[protV] ? chs[protV].includes(DISABLED_ADAPTER_KEY) : true
} */

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
    if (c === 'avax') return "Avalanche"
    if (c === 'bsc') return c.toUpperCase()
    if (c === 'xdai') return "xDai"
    if (c === 'terra' || c === 'terra-classic') return "Terra Classic"
    return c[0].toUpperCase() + c.slice(1)
}

export const formatChainKey = (chain: string) => {
    if (chain === 'avalanche') return CHAIN.AVAX
    if (chain === 'terra classic' || chain === 'terra-classic') return CHAIN.TERRA
    if (chain.toLowerCase() === 'karura') return CHAIN.KARURA
    return chain
}

export default getAllChainsFromAdaptors