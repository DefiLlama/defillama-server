import { Chain } from "@defillama/sdk/build/general";
import dexVolumes from "@defillama/adapters/volumes";
import { DISABLED_ADAPTER_KEY, VolumeAdapter } from "@defillama/adapters/volumes/dexVolume.type";
import { CHAIN } from "@defillama/adapters/volumes/helper/chains";

const getAllChainsFromDexAdapters = (dexs2Filter: string[], filter: boolean = true) =>
    Object.entries(dexVolumes as { [volumeName: string]: VolumeAdapter })
        .filter(([key]) => dexs2Filter.includes(key))
        .map(([_, volume]) => volume)
        .reduce((acc, dexAdapter) => {
            if ("volume" in dexAdapter) {
                const chains = (Object.keys(dexAdapter.volume)).filter(c => !filter || c !== DISABLED_ADAPTER_KEY) as Chain[]
                for (const chain of chains)
                    if (!acc.includes(chain)) acc.push(chain)
            } else if ("breakdown" in dexAdapter) {
                for (const brokenDownDex of Object.values(dexAdapter.breakdown)) {
                    const chains = Object.keys(brokenDownDex).filter(c => c !== DISABLED_ADAPTER_KEY) as Chain[]
                    for (const chain of chains)
                        if (!acc.includes(chain)) acc.push(chain)
                }
            } else console.error("Invalid adapter")
            return acc
        }, [] as Chain[])

export const isDisabled = (dex: string) => getAllChainsFromDexAdapters([dex], false).includes(DISABLED_ADAPTER_KEY as Chain)

export const getChainByProtocolVersion = (adapterVolume: string, chainFilter?: string, filter: boolean = true) => {
    const dexAdapter = (dexVolumes as { [volumeAdapter: string]: VolumeAdapter })[adapterVolume]
    const chainsAcc: {
        [protVersion: string]: string[]
    } = {}
    if ("volume" in dexAdapter) {
        return null
    } else if ("breakdown" in dexAdapter) {
        for (const [protVersion, brokenDownDex] of Object.entries(dexAdapter.breakdown)) {
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
    return chainsAcc
}

export const isDisabledByProtocolVersion = (adapterVolume: string, chainFilter?: string, protV?: string) => {
    const chs = getChainByProtocolVersion(adapterVolume, chainFilter, false)
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

export default getAllChainsFromDexAdapters