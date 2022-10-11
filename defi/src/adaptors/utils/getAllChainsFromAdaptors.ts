import { Chain } from "@defillama/sdk/build/general";
import dexVolumes from "@defillama/adapters/volumes";
import { DISABLED_ADAPTER_KEY, Adapter } from "@defillama/adaptors/adapters/types";
import { CHAIN } from "@defillama/adaptors/helpers/chains";
import { IImportsMap } from "../data/helpers/generateProtocolAdaptorsList";

const getAllChainsFromAdaptors = (dexs2Filter: string[], imports_obj: IImportsMap, filter: boolean = true) =>
    //Object.entries(dexVolumes as unknown as { [volumeName: string]: Adapter })
    dexs2Filter.reduce((acc, adapterName) => {
        const adaptor = imports_obj[adapterName].default
        if (!adaptor) return acc
        if ("adapter" in adaptor) {
            const chains = (Object.keys(adaptor.adapter)).filter(c => !filter || c !== DISABLED_ADAPTER_KEY) as Chain[]
            for (const chain of chains)
                if (!acc.includes(chain)) acc.push(chain)
        } else if ("breakdown" in adaptor) {
            for (const brokenDownDex of Object.values(adaptor.breakdown)) {
                const chains = Object.keys(brokenDownDex).filter(c => c !== DISABLED_ADAPTER_KEY) as Chain[]
                for (const chain of chains)
                    if (!acc.includes(chain)) acc.push(chain)
            }
        } else console.error("Invalid adapterdd", adapterName, imports_obj[adapterName])
        return acc
    }, [] as Chain[])

export const isDisabled = (dex: string, imports_obj: IImportsMap) => getAllChainsFromAdaptors([dex], imports_obj, false).includes(DISABLED_ADAPTER_KEY as Chain)

export const getChainByProtocolVersion = (moduleAdapter: Adapter, chainFilter?: string, filter: boolean = true) => {
    const chainsAcc: {
        [protVersion: string]: string[]
    } = {}
    if ("adapter" in moduleAdapter) {
        return null
    } else if ("breakdown" in moduleAdapter) {
        for (const [protVersion, brokenDownDex] of Object.entries(moduleAdapter.breakdown)) {
            const chains = Object.keys(brokenDownDex).filter(c => (!filter || c !== DISABLED_ADAPTER_KEY)) as Chain[]
            for (const c of chains) {
                const chain = formatChain(c)
                if (chainFilter && chain !== formatChain(chainFilter)) continue
                if (chainsAcc[protVersion]) {
                    if (!chainsAcc[protVersion].includes(chain)) chainsAcc[protVersion].push(chain)
                }
                else chainsAcc[protVersion] = [chain]
            }
        }
    } else console.error("Invalid adapter")
    return Object.keys(chainsAcc).length === 0 ? null : chainsAcc
}

export const isDisabledByProtocolVersion = (moduleAdapter: Adapter, chainFilter?: string, protV?: string) => {
    const chs = getChainByProtocolVersion(moduleAdapter, chainFilter, false)
    if (!chs || !protV) return false
    return chs[protV] ? chs[protV].includes(DISABLED_ADAPTER_KEY) : true
}

/* export const formatChain = (chain: string) => {
    let c = chain
    if (chain === 'avax') c = "avalanche"
    else if (chain === 'terra') c = 'terra classic'
    return c[0].toUpperCase() + c.slice(1)
} */

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
    return chain.toLowerCase()
}

export default getAllChainsFromAdaptors